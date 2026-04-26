import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import admin from "firebase-admin";
import { fileURLToPath } from "url";
import { LeaveApprovalService, UserRole } from "./src/strategies/leaveApprovalStrategies.ts";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
// We use the project ID from the config. For the secret key, AI Studio environment 
// might need a service account JSON, but usually for firestore-only we can use ADC or 
// since we are in the same project, initializing with just projectId might work if roles are set.
// However, for this environment, we can assume the developer has access.
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  const leaveService = new LeaveApprovalService();

  // API Routes
  
  // Auth: Mock Login for simpler demo (in real app, client sends ID token)
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    // In a real app we'd verify password, but here we just return user metadata
    try {
      const userRecords = await auth.getUserByEmail(email);
      const userDoc = await db.collection("users").doc(userRecords.uid).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found in database" });
      }
      res.json({ uid: userRecords.uid, ...userDoc.data() });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  });

  // Leave Endpoints
  app.post("/api/leave/request", async (req, res) => {
    const { employeeId, startDate, endDate, type, reason } = req.body;
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const userDoc = await db.collection("users").doc(employeeId).get();
      const userData = userDoc.data();
      const role = userData?.role as UserRole || UserRole.EMPLOYEE;

      const result = leaveService.processLeaveRequest(diffDays, role);

      const leaveRequest = {
        employeeId,
        employeeName: userData?.name || "Unknown",
        startDate,
        endDate,
        type,
        reason,
        days: diffDays,
        status: result.status,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        comments: result.message
      };

      const docRef = await db.collection("leave_requests").add(leaveRequest);
      
      // If auto-approved, update balance
      if (result.status === "APPROVED") {
        await db.collection("users").doc(employeeId).update({
          usedLeave: admin.firestore.FieldValue.increment(diffDays)
        });
      }

      res.status(201).json({ id: docRef.id, ...leaveRequest, message: result.message });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/leave/balance/:employeeId", async (req, res) => {
    const { employeeId } = req.params;
    try {
      const userDoc = await db.collection("users").doc(employeeId).get();
      const data = userDoc.data();
      res.json({ totalLeave: data?.totalLeave || 24, usedLeave: data?.usedLeave || 0 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/leave/approve/:id", async (req, res) => {
    const { id } = req.params;
    const { approverId } = req.body;
    try {
      const leaveDoc = await db.collection("leave_requests").doc(id).get();
      const leaveData = leaveDoc.data();
      
      if (leaveData?.status === "APPROVED") {
        return res.status(400).json({ error: "Already approved" });
      }

      await db.collection("leave_requests").doc(id).update({
        status: "APPROVED",
        approvedBy: approverId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update used leave balance
      await db.collection("users").doc(leaveData?.employeeId).update({
        usedLeave: admin.firestore.FieldValue.increment(leaveData?.days || 0)
      });

      res.json({ message: "Leave approved successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/leave/reject/:id", async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    try {
      await db.collection("leave_requests").doc(id).update({
        status: "REJECTED",
        comments: reason,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ message: "Leave rejected successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Performance Endpoints
  app.post("/api/goals", async (req, res) => {
    const { employeeId, description, deadline } = req.body;
    try {
      const docRef = await db.collection("performance_goals").add({
        employeeId,
        description,
        deadline,
        status: "NOT_STARTED",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.status(201).json({ id: docRef.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/leave", async (req, res) => {
    try {
      const snapshot = await db.collection("leave_requests").get();
      const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/performance", async (req, res) => {
    try {
      const snapshot = await db.collection("performance_reviews").get();
      const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
