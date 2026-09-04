import { supabase } from "./supabase";

export type AppTask = {
  id: string;
  title: string;
  dueAt: string | null;
  meta: string;
  person: string;
  tone: string;
  done: boolean;
  priority: string;
};

export type AppList = {
  id: string;
  name: string;
  items: string[];
  itemIds: string[];
  checked: boolean[];
};

export type AppEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  createdBy: string;
};
export type AppTransaction = {
  id: string;
  description: string;
  amount: number;
  kind: "income" | "expense" | "transfer";
  category: string;
  occurredOn: string;
  purchaseDate: string;
  dueDate: string | null;
  status: "paid" | "pending";
  paymentMethod: string | null;
  paidBy: string | null;
  recurrence: string | null;
  notes: string | null;
  receiptPath: string | null;
};
export type AppCategory = { id: string; name: string };
export type AppRecurring = {
  id: string;
  name: string;
  kind: "income" | "expense";
  amount: number;
  categoryId: string | null;
  dayOfMonth: number;
  nextDue: string;
  recurrence: string;
  paymentMethod: string | null;
  payerId: string | null;
  active: boolean;
  notes: string | null;
};
export type AppBudget = {
  id: string;
  categoryId: string;
  monthStart: string;
  limitAmount: number;
};
export type AppMessage = {
  id: string;
  body: string;
  authorId: string;
  createdAt: string;
};
export type AppMember = {
  userId: string;
  displayName: string;
  email: string | null;
  role: string;
  avatarPath: string | null;
};
export type AppDocument = {
  id: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};
export type AppMeal = {
  id: string;
  mealDate: string;
  title: string;
  details: string | null;
};
export type AppRoutine = { id: string; title: string; schedule: string | null };
export type AppBirthday = { id: string; name: string; birthday: string };
export type AppFamily = { id: string; name: string };

export async function loadFamilies(userId: string): Promise<AppFamily[]> {
  const { data, error } = await supabase
    .from("family_members")
    .select("family_id, families(id,name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .map((row: { family_id: string; families?: { name?: string } | null }) => ({
      id: row.family_id,
      name: row.families?.name ?? "Minha família",
    }))
    .filter((family, index, all) => all.findIndex((item) => item.id === family.id) === index);
}

export async function getFamily(userId: string) {
  const existing = await supabase
    .from("family_members")
    .select("family_id, families(*)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (existing.error) throw existing.error;
  return (existing.data?.family_id as string | null) ?? null;
}

export async function createFamily(name: string) {
  const created = await supabase.rpc("create_family", { p_name: name.trim() });
  if (created.error) throw created.error;
  return created.data as string;
}

export async function createFamilyInvite(familyId: string, email: string) {
  const { data, error } = await supabase
    .from("family_invitations")
    .insert({ family_id: familyId, email: email.trim().toLowerCase() })
    .select("token")
    .single();
  if (error) throw error;
  return data.token as string;
}

export async function updateFamilyMemberRole(
  familyId: string,
  userId: string,
  role: string,
) {
  const { error } = await supabase.rpc("update_family_member_role", {
    p_family_id: familyId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw error;
}

export async function removeFamilyMember(familyId: string, userId: string) {
  const { error } = await supabase.rpc("remove_family_member", {
    p_family_id: familyId,
    p_user_id: userId,
  });
  if (error) throw error;
}

export async function acceptFamilyInvitation(token: string) {
  const { data, error } = await supabase.rpc("accept_family_invitation", {
    p_token: token,
  });
  if (error) throw error;
  return data as string;
}

export async function loadTasks(familyId: string): Promise<AppTask[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("id,title,due_at,priority,completed,assigned_to")
    .eq("family_id", familyId)
    .order("due_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    dueAt: row.due_at,
    meta: row.due_at
      ? new Date(row.due_at).toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "Sem prazo",
    person: row.assigned_to ? "Membro" : "Você",
    tone: "orange",
    done: row.completed,
    priority: row.priority,
  }));
}

export async function createTask(
  familyId: string,
  userId: string,
  title: string,
) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      family_id: familyId,
      created_by: userId,
      title,
      priority: "Normal",
    })
    .select("id,title,priority,completed")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    title: data.title,
    dueAt: null,
    meta: "Criada agora",
    person: "Você",
    tone: "orange",
    done: data.completed,
    priority: data.priority,
  } satisfies AppTask;
}

export async function setTaskCompleted(id: string, completed: boolean) {
  const { error } = await supabase
    .from("tasks")
    .update({ completed, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function loadLists(familyId: string): Promise<AppList[]> {
  const { data, error } = await supabase
    .from("shopping_lists")
    .select("id,name,shopping_items(id,label,checked)")
    .eq("family_id", familyId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    items: (row.shopping_items ?? []).map((item: any) => item.label),
    itemIds: (row.shopping_items ?? []).map((item: any) => item.id),
    checked: (row.shopping_items ?? []).map((item: any) => item.checked),
  }));
}

export async function setShoppingItemChecked(id: string, checked: boolean) {
  const { error } = await supabase
    .from("shopping_items")
    .update({ checked, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function createShoppingList(
  familyId: string,
  userId: string,
  name: string,
) {
  const { data, error } = await supabase
    .from("shopping_lists")
    .insert({ family_id: familyId, created_by: userId, name: name.trim() })
    .select("id,name")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    items: [],
    itemIds: [],
    checked: [],
  } satisfies AppList;
}

export async function createShoppingItem(
  listId: string,
  userId: string,
  label: string,
) {
  const { data, error } = await supabase
    .from("shopping_items")
    .insert({ list_id: listId, created_by: userId, label: label.trim() })
    .select("id,label,checked")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteShoppingItem(id: string) {
  const { error } = await supabase.from("shopping_items").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteShoppingList(id: string) {
  const { error } = await supabase.from("shopping_lists").delete().eq("id", id);
  if (error) throw error;
}

export async function loadEvents(familyId: string): Promise<AppEvent[]> {
  const { data, error } = await supabase
    .from("family_events")
    .select("id,title,starts_at,ends_at,location,created_by")
    .eq("family_id", familyId)
    .order("starts_at");
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.location,
    createdBy: row.created_by,
  }));
}

export async function createEvent(
  familyId: string,
  userId: string,
  title: string,
  startsAt: string,
) {
  const { data, error } = await supabase
    .from("family_events")
    .insert({
      family_id: familyId,
      created_by: userId,
      title: title.trim(),
      starts_at: startsAt,
    })
    .select("id,title,starts_at,ends_at,location,created_by")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    title: data.title,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    location: data.location,
    createdBy: data.created_by,
  } satisfies AppEvent;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from("family_events").delete().eq("id", id);
  if (error) throw error;
}

export async function loadTransactions(
  familyId: string,
): Promise<AppTransaction[]> {
  const { data, error } = await supabase
    .from("finance_transactions")
    .select(
      "id,description,amount,kind,category,occurred_on,purchase_date,due_date,status,payment_method,paid_by,recurrence,notes,receipt_path",
    )
    .eq("family_id", familyId)
    .order("purchase_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    kind: row.kind,
    category: row.category,
    occurredOn: row.occurred_on,
    purchaseDate: row.purchase_date,
    dueDate: row.due_date,
    status: row.status,
    paymentMethod: row.payment_method,
    paidBy: row.paid_by,
    recurrence: row.recurrence,
    notes: row.notes,
    receiptPath: row.receipt_path,
  }));
}

export async function createTransaction(
  familyId: string,
  userId: string,
  input: Pick<AppTransaction, "description" | "amount" | "kind" | "category">,
) {
  const { data, error } = await supabase
    .from("finance_transactions")
    .insert({
      family_id: familyId,
      created_by: userId,
      ...input,
      purchase_date: new Date().toISOString().slice(0, 10),
      status: "paid",
    })
    .select(
      "id,description,amount,kind,category,occurred_on,purchase_date,due_date,status,payment_method,paid_by,recurrence,notes,receipt_path",
    )
    .single();
  if (error) throw error;
  return {
    id: data.id,
    description: data.description,
    amount: Number(data.amount),
    kind: data.kind,
    category: data.category,
    occurredOn: data.occurred_on,
    purchaseDate: data.purchase_date,
    dueDate: data.due_date,
    status: data.status,
    paymentMethod: data.payment_method,
    paidBy: data.paid_by,
    recurrence: data.recurrence,
    notes: data.notes,
    receiptPath: data.receipt_path,
  } satisfies AppTransaction;
}

export type DetailedTransactionInput = {
  description: string;
  amount: number;
  kind: "income" | "expense" | "transfer";
  category: string;
  purchaseDate: string;
  dueDate?: string;
  status: "paid" | "pending";
  paymentMethod?: string;
  paidBy?: string;
  recurrence?: string;
  notes?: string;
};
export async function createDetailedTransaction(
  familyId: string,
  userId: string,
  input: DetailedTransactionInput,
) {
  const { data, error } = await supabase
    .from("finance_transactions")
    .insert({
      family_id: familyId,
      created_by: userId,
      description: input.description.trim(),
      amount: input.amount,
      kind: input.kind,
      category: input.category,
      purchase_date: input.purchaseDate,
      due_date: input.dueDate || null,
      status: input.status,
      payment_method: input.paymentMethod || null,
      paid_by: input.paidBy || null,
      recurrence: input.recurrence || null,
      notes: input.notes?.trim() || null,
    })
    .select(
      "id,description,amount,kind,category,occurred_on,purchase_date,due_date,status,payment_method,paid_by,recurrence,notes,receipt_path",
    )
    .single();
  if (error) throw error;
  return {
    id: data.id,
    description: data.description,
    amount: Number(data.amount),
    kind: data.kind,
    category: data.category,
    occurredOn: data.occurred_on,
    purchaseDate: data.purchase_date,
    dueDate: data.due_date,
    status: data.status,
    paymentMethod: data.payment_method,
    paidBy: data.paid_by,
    recurrence: data.recurrence,
    notes: data.notes,
    receiptPath: data.receipt_path,
  } satisfies AppTransaction;
}
export async function uploadFinanceReceipt(
  familyId: string,
  userId: string,
  transactionId: string,
  file: File,
) {
  if (file.size === 0 || file.size > 10 * 1024 * 1024)
    throw new Error("O comprovante deve ter até 10 MB.");
  const path = `${familyId}/receipts/${transactionId}-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const uploaded = await supabase.storage
    .from("family-documents")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (uploaded.error) throw uploaded.error;
  const { error } = await supabase
    .from("finance_transactions")
    .update({ receipt_path: path })
    .eq("id", transactionId);
  if (error) {
    await supabase.storage.from("family-documents").remove([path]);
    throw error;
  }
  return path;
}
export async function updateTransaction(
  id: string,
  input: Partial<DetailedTransactionInput>,
) {
  const { error } = await supabase
    .from("finance_transactions")
    .update({
      description: input.description?.trim(),
      amount: input.amount,
      kind: input.kind,
      category: input.category,
      purchase_date: input.purchaseDate,
      due_date: input.dueDate || null,
      status: input.status,
      payment_method: input.paymentMethod || null,
      paid_by: input.paidBy || null,
      recurrence: input.recurrence || null,
      notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}
export async function loadCategories(
  familyId: string,
  userId: string,
): Promise<AppCategory[]> {
  const defaultCategoryNames = [
    "Moradia",
    "Alimentação",
    "Mercado",
    "Transporte",
    "Saúde",
    "Educação",
    "Lazer",
    "Assinaturas",
    "Animais",
    "Dívidas",
    "Outros",
    "Cartão",
  ];
  const { data, error } = await supabase
    .from("finance_categories")
    .select("id,name")
    .eq("family_id", familyId)
    .order("name");
  if (error) throw error;
  if (!data?.length) {
    await supabase
      .from("finance_categories")
      .insert(
        defaultCategoryNames.map((name) => ({
          family_id: familyId,
          name,
          created_by: userId,
        })),
      );
  } else if (!data.some((category) => category.name.toLocaleLowerCase() === "cartão")) {
    const { error: categoryError } = await supabase
      .from("finance_categories")
      .upsert(
        { family_id: familyId, name: "Cartão", created_by: userId },
        { onConflict: "family_id,name", ignoreDuplicates: true },
      );
    if (categoryError) throw categoryError;
  }
  const categories = await supabase
    .from("finance_categories")
    .select("id,name")
    .eq("family_id", familyId)
    .order("name");
  if (categories.error) throw categories.error;
  return categories.data ?? [];
}
export async function createCategory(
  familyId: string,
  userId: string,
  name: string,
) {
  const { data, error } = await supabase
    .from("finance_categories")
    .insert({ family_id: familyId, created_by: userId, name: name.trim() })
    .select("id,name")
    .single();
  if (error) throw error;
  return data as AppCategory;
}
export async function loadRecurring(familyId: string): Promise<AppRecurring[]> {
  const { data, error } = await supabase
    .from("finance_recurring")
    .select(
      "id,name,kind,amount,category_id,day_of_month,next_due,recurrence,payment_method,payer_id,active,notes",
    )
    .eq("family_id", familyId)
    .order("next_due");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    amount: Number(r.amount),
    categoryId: r.category_id,
    dayOfMonth: r.day_of_month,
    nextDue: r.next_due,
    recurrence: r.recurrence,
    paymentMethod: r.payment_method,
    payerId: r.payer_id,
    active: r.active,
    notes: r.notes,
  }));
}
export async function createRecurring(
  familyId: string,
  userId: string,
  input: Omit<AppRecurring, "id">,
) {
  const { error } = await supabase.from("finance_recurring").insert({
    family_id: familyId,
    created_by: userId,
    name: input.name,
    kind: input.kind,
    amount: input.amount,
    category_id: input.categoryId,
    day_of_month: input.dayOfMonth,
    next_due: input.nextDue,
    recurrence: input.recurrence,
    payment_method: input.paymentMethod,
    payer_id: input.payerId,
    active: input.active,
    notes: input.notes,
  });
  if (error) throw error;
}
export async function loadBudgets(
  familyId: string,
  monthStart: string,
): Promise<AppBudget[]> {
  const { data, error } = await supabase
    .from("finance_budgets")
    .select("id,category_id,month_start,limit_amount")
    .eq("family_id", familyId)
    .eq("month_start", monthStart);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    categoryId: r.category_id,
    monthStart: r.month_start,
    limitAmount: Number(r.limit_amount),
  }));
}
export async function upsertBudget(
  familyId: string,
  userId: string,
  categoryId: string,
  monthStart: string,
  limitAmount: number,
) {
  const { error } = await supabase.from("finance_budgets").upsert(
    {
      family_id: familyId,
      created_by: userId,
      category_id: categoryId,
      month_start: monthStart,
      limit_amount: limitAmount,
    },
    { onConflict: "family_id,category_id,month_start" },
  );
  if (error) throw error;
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase
    .from("finance_transactions")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function loadMessages(familyId: string): Promise<AppMessage[]> {
  const { data, error } = await supabase
    .from("family_messages")
    .select("id,body,author_id,created_at")
    .eq("family_id", familyId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    body: row.body,
    authorId: row.author_id,
    createdAt: row.created_at,
  }));
}

export async function createMessage(
  familyId: string,
  userId: string,
  body: string,
) {
  const { data, error } = await supabase
    .from("family_messages")
    .insert({ family_id: familyId, author_id: userId, body: body.trim() })
    .select("id,body,author_id,created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    body: data.body,
    authorId: data.author_id,
    createdAt: data.created_at,
  } satisfies AppMessage;
}

export async function deleteMessage(id: string) {
  const { error } = await supabase
    .from("family_messages")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function loadMembers(familyId: string): Promise<AppMember[]> {
  const { data, error } = await supabase
    .from("family_members")
    .select("user_id,role")
    .eq("family_id", familyId);
  if (error) throw error;
  const ids = (data ?? []).map((row) => row.user_id);
  if (!ids.length) return [];
  const profiles = await supabase
    .from("profiles")
    .select("id,display_name,avatar_path")
    .in("id", ids);
  if (profiles.error) throw profiles.error;
  const byId = new Map(
    (profiles.data ?? []).map((profile) => [profile.id, profile]),
  );
  return (data ?? []).map((row) => {
    const profile = byId.get(row.user_id);
    return {
      userId: row.user_id,
      displayName: profile?.display_name || "Membro da família",
      email: null,
      role: row.role,
      avatarPath: profile?.avatar_path ?? null,
    };
  });
}

export async function loadDocuments(familyId: string): Promise<AppDocument[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("id,original_name,storage_path,mime_type,size_bytes,created_at")
    .eq("family_id", familyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    originalName: row.original_name,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    createdAt: row.created_at,
  }));
}

export async function uploadDocument(
  familyId: string,
  userId: string,
  file: File,
  displayName?: string,
) {
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/heic"];
  if (!allowed.includes(file.type))
    throw new Error("Formato não suportado. Use PDF, JPG, PNG ou HEIC.");
  if (file.size === 0 || file.size > 10 * 1024 * 1024)
    throw new Error("O arquivo deve ter até 10 MB.");
  const path = `${familyId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const uploaded = await supabase.storage
    .from("family-documents")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (uploaded.error) throw uploaded.error;
  const originalName = displayName?.trim() || file.name;
  const { data, error } = await supabase
    .from("documents")
    .insert({
      family_id: familyId,
      owner_id: userId,
      storage_path: path,
      original_name: originalName.slice(0, 150),
      mime_type: file.type,
      size_bytes: file.size,
      visibility: "owner",
    })
    .select("id,original_name,storage_path,mime_type,size_bytes,created_at")
    .single();
  if (error) {
    await supabase.storage.from("family-documents").remove([path]);
    throw error;
  }
  return {
    id: data.id,
    originalName: data.original_name,
    storagePath: data.storage_path,
    mimeType: data.mime_type,
    sizeBytes: Number(data.size_bytes),
    createdAt: data.created_at,
  } satisfies AppDocument;
}

export async function deleteDocument(id: string, storagePath: string) {
  const removed = await supabase.storage
    .from("family-documents")
    .remove([storagePath]);
  if (removed.error) throw removed.error;
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
}

export async function getDocumentUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from("family-documents")
    .createSignedUrl(storagePath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export type AppNotification = {
  id: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function loadNotifications(
  userId: string,
  familyId: string,
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("family_notifications")
    .select("id,title,body,read_at,created_at")
    .eq("user_id", userId)
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from("family_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function loadMeals(familyId: string): Promise<AppMeal[]> {
  const { data, error } = await supabase
    .from("family_meals")
    .select("id,meal_date,title,details")
    .eq("family_id", familyId)
    .order("meal_date");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    mealDate: row.meal_date,
    title: row.title,
    details: row.details,
  }));
}
export async function createMeal(
  familyId: string,
  userId: string,
  mealDate: string,
  title: string,
  details?: string,
) {
  const { data, error } = await supabase
    .from("family_meals")
    .insert({
      family_id: familyId,
      created_by: userId,
      meal_date: mealDate,
      title: title.trim(),
      details: details?.trim() || null,
    })
    .select("id,meal_date,title,details")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    mealDate: data.meal_date,
    title: data.title,
    details: data.details,
  } satisfies AppMeal;
}
export async function deleteMeal(id: string) {
  const { error } = await supabase.from("family_meals").delete().eq("id", id);
  if (error) throw error;
}
export async function loadRoutines(familyId: string): Promise<AppRoutine[]> {
  const { data, error } = await supabase
    .from("family_routines")
    .select("id,title,schedule")
    .eq("family_id", familyId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    schedule: row.schedule,
  }));
}
export async function createRoutine(
  familyId: string,
  userId: string,
  title: string,
  schedule?: string,
) {
  const { data, error } = await supabase
    .from("family_routines")
    .insert({
      family_id: familyId,
      created_by: userId,
      title: title.trim(),
      schedule: schedule?.trim() || null,
    })
    .select("id,title,schedule")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    title: data.title,
    schedule: data.schedule,
  } satisfies AppRoutine;
}
export async function deleteRoutine(id: string) {
  const { error } = await supabase
    .from("family_routines")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
export async function loadBirthdays(familyId: string): Promise<AppBirthday[]> {
  const { data, error } = await supabase
    .from("family_birthdays")
    .select("id,name,birthday")
    .eq("family_id", familyId)
    .order("birthday");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    birthday: row.birthday,
  }));
}
export async function createBirthday(
  familyId: string,
  userId: string,
  name: string,
  birthday: string,
) {
  const { data, error } = await supabase
    .from("family_birthdays")
    .insert({
      family_id: familyId,
      created_by: userId,
      name: name.trim(),
      birthday,
    })
    .select("id,name,birthday")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    birthday: data.birthday,
  } satisfies AppBirthday;
}
export async function deleteBirthday(id: string) {
  const { error } = await supabase
    .from("family_birthdays")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
