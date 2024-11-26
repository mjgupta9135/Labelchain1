import express from "express";
import cors from "cors";
import userRouter from "./routers/user";
import workerRouter from "./routers/worker";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3001", // Allow requests from the frontend origin
  })
);

app.use("/v1/user", userRouter);
app.use("/v1/worker", workerRouter);

app.listen(3000, () => {
  console.log("App is listening on port 3000");
});
