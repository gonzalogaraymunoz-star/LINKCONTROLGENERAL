import { redirect } from "next/navigation";

export default function CaracolTasksPage() {
  redirect("/?client=caracol&tab=tasks");
}
