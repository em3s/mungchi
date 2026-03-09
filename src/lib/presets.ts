import { supabase } from "@/lib/supabase/client";

export interface TaskPreset {
  id: string;
  title: string;
  sort_order: number;
}

export async function getPresets(): Promise<TaskPreset[]> {
  const { data } = await supabase
    .from("task_presets")
    .select("*")
    .order("sort_order")
    .order("created_at");
  return data ?? [];
}

export async function addPreset(title: string): Promise<boolean> {
  const { error } = await supabase
    .from("task_presets")
    .insert({ title });
  return !error;
}

export async function deletePreset(id: string): Promise<boolean> {
  const { error } = await supabase.from("task_presets").delete().eq("id", id);
  return !error;
}
