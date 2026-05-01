"use client";

import { use } from "react";
import { FormDefinitionEditor } from "../../../../../components/admin/form-definition-editor";

export default function FormDefinitionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <FormDefinitionEditor mode="edit" id={id} />;
}
