import axios from "axios";
const BACKEND_URL = "http://localhost:3000";

export async function getTaskDetails(taskId: string) {
  try {
    const response = await axios.get(
      `${BACKEND_URL}/v1/user/task?taskId=${taskId}`,
      {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      }
    );
    return response.data; // Return the response data
  } catch (error) {
    console.error("Error fetching task details:", error);
    throw error; // Throw error if request fails
  }
}
