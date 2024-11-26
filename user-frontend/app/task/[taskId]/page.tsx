"use client";
import { Appbar } from "@/components/Appbar";
import { BACKEND_URL } from "@/utils";
import axios from "axios";
import { useEffect, useState } from "react";

async function getTaskDetails(taskId: number) {
  console.log(taskId);
  console.log(typeof taskId); // Ensure it logs 'number'

  const response = await axios.get(
    `${BACKEND_URL}/v1/user/task?taskid=${taskId}`, // Update 'taskId' to 'taskid' here
    {
      headers: {
        Authorization: localStorage.getItem("token") || "",
      },
    }
  );
  return response.data;
}

export default function Page({
  params: { taskId },
}: {
  params: { taskId: string }; // taskId comes as a string from Next.js route
}) {
  const [result, setResult] = useState<
    Record<
      string,
      {
        count: number;
        option: {
          imageUrl: string;
        };
      }
    >
  >({});
  const [taskDetails, setTaskDetails] = useState<{
    title?: string;
  }>({});

  useEffect(() => {
    const numericTaskId = Number(taskId); // Convert string to number
    if (isNaN(numericTaskId)) {
      console.error("Invalid task ID:", taskId);
      return;
    }
    getTaskDetails(numericTaskId).then((data) => {
      setResult(data.result);
      setTaskDetails(data.taskDetails);
    });
  }, [taskId]);

  return (
    <div>
      <Appbar />
      <div className="text-2xl pt-20 flex justify-center">
        {taskDetails.title}
      </div>
      <div className="flex justify-center pt-8">
        {Object.keys(result || {}).map((key) => (
          <Task
            key={key}
            imageUrl={result[key].option.imageUrl}
            votes={result[key].count}
          />
        ))}
      </div>
    </div>
  );
}

function Task({ imageUrl, votes }: { imageUrl: string; votes: number }) {
  return (
    <div>
      <img className={"p-2 w-96 rounded-md"} src={imageUrl} />
      <div className="flex justify-center">{votes}</div>
    </div>
  );
}
