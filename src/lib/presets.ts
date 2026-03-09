import { supabase } from "@/lib/supabase/client";

export interface TaskPreset {
  id: string;
  user_id: string;
  title: string;
  sort_order: number;
}

export async function getPresets(userId: string): Promise<TaskPreset[]> {
  const { data } = await supabase
    .from("task_presets")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order")
    .order("created_at");
  return data ?? [];
}

export async function addPreset(userId: string, title: string): Promise<boolean> {
  const { error } = await supabase
    .from("task_presets")
    .insert({ user_id: userId, title });
  return !error;
}

export async function deletePreset(id: string): Promise<boolean> {
  const { error } = await supabase.from("task_presets").delete().eq("id", id);
  return !error;
}

export async function updatePresetOrder(id: string, sort_order: number): Promise<boolean> {
  const { error } = await supabase
    .from("task_presets")
    .update({ sort_order })
    .eq("id", id);
  return !error;
}
