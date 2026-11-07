import { revalidatePath } from "next/cache";

export function refreshApp() {
  revalidatePath("/", "layout");
}
