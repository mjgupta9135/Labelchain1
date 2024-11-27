import express from "express";
import cors from "cors";
import userRouter from "./routers/user";
import workerRouter from "./routers/worker";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3001", "http://localhost:3002"], // Allow both origins
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Include OPTIONS
    allowedHeaders: ["Content-Type", "Authorization"], // Add other headers if needed
    credentials: true, // If credentials are needed, set this to true
  })
);

app.use("/v1/user", userRouter);
app.use("/v1/worker", workerRouter);

app.listen(3000, () => {
  console.log("App is listening on port 3000");
});
