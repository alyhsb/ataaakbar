import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DonorForm } from "@/components/DonorForm";
import { addDonor } from "@/lib/donors-store";

export const Route = createFileRoute("/_authenticated/donors/new")({
  head: () => ({
    meta: [
      { title: "إضافة متبرع جديد — عطاء" },
      {
        name: "description",
        content: "أضف متبرعاً جديداً إلى الموكب وحدد مبلغ التبرع الشهري والملاحظات.",
      },
      { property: "og:title", content: "إضافة متبرع جديد — عطاء" },
      { property: "og:description", content: "تسجيل متبرع جديد ضمن تبرعات الموكب الشهرية." },
    ],
  }),
  component: AddDonorPage,
});

function AddDonorPage() {
  const navigate = useNavigate();

  return (
    <AppShell title="إضافة متبرع" subtitle="سجّل متبرعاً جديداً في قائمة الموكب">
      <DonorForm
        initial={{ name: "", phone: "", area: "", monthlyAmount: 50000, notes: "" }}
        submitLabel="حفظ المتبرع"
        onSubmit={async (values) => {
          try {
            const donor = await addDonor(values);
            toast.success("تمت إضافة المتبرع بنجاح");
            navigate({ to: "/donors/$donorId", params: { donorId: donor.id } });
          } catch {
            toast.error("تعذّر حفظ المتبرع");
          }
        }}
      />
    </AppShell>
  );
}
