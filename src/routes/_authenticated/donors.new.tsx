import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DonorForm } from "@/components/DonorForm";
import { errorMessage, loadAll } from "@/lib/donors-store";
import { createDonorWithAccount } from "@/lib/accounts.functions";

export const Route = createFileRoute("/_authenticated/donors/new")({
  head: () => ({
    meta: [
      { title: "إضافة متبرع جديد — عطاء الأكبر" },
      {
        name: "description",
        content: "أضف متبرعاً جديداً إلى الموكب وحدد مبلغ التبرع الشهري والملاحظات.",
      },
      { property: "og:title", content: "إضافة متبرع جديد — عطاء الأكبر" },
      { property: "og:description", content: "تسجيل متبرع جديد ضمن تبرعات الموكب الشهرية." },
    ],
  }),
  component: AddDonorPage,
});

function AddDonorPage() {
  const navigate = useNavigate();
  const createDonor = useServerFn(createDonorWithAccount);

  return (
    <AppShell title="إضافة متبرع" subtitle="سجّل متبرعاً جديداً وأنشئ له رمز دخول">
      <DonorForm
        initial={{
          name: "",
          phone: "",
          area: "",
          location: "",
          monthlyAmount: 50000,
          dueDay: 5,
          notes: "",
          accessCode: "",
        }}
        withAccessCode
        submitLabel="حفظ المتبرع"
        onSubmit={async (values) => {
          try {
            const res = await createDonor({
              data: {
                name: values.name,
                phone: values.phone,
                accessCode: values.accessCode ?? "",
                area: values.area,
                location: values.location,
                monthlyAmount: values.monthlyAmount,
                dueDay: values.dueDay,
                notes: values.notes,
              },
            });
            await loadAll();
            toast.success("تمت إضافة المتبرع وإنشاء حساب الدخول بنجاح");
            navigate({ to: "/donors/$donorId", params: { donorId: res.donorId } });
          } catch (err) {
            toast.error(errorMessage(err, "تعذّر حفظ المتبرع"));
          }
        }}
      />
    </AppShell>
  );
}
