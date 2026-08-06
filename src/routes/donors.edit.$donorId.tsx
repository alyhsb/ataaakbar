import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DonorForm } from "@/components/DonorForm";
import { useDonor, updateDonor } from "@/lib/donors-store";

export const Route = createFileRoute("/donors/edit/$donorId")({
  head: () => ({
    meta: [
      { title: "تعديل بيانات المتبرع — عطاء" },
      {
        name: "description",
        content: "عدّل اسم المتبرع ورقم هاتفه ومبلغ تبرعه الشهري والملاحظات الخاصة به.",
      },
      { property: "og:title", content: "تعديل بيانات المتبرع — عطاء" },
      { property: "og:description", content: "تحديث بيانات أحد متبرعي الموكب الحسيني." },
    ],
  }),
  component: EditDonorPage,
});

function EditDonorPage() {
  const { donorId } = Route.useParams();
  const donor = useDonor(donorId);
  const navigate = useNavigate();

  if (!donor) {
    return (
      <AppShell title="المتبرع غير موجود">
        <Link to="/donors" className="text-sm font-semibold text-primary">
          العودة إلى القائمة
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell title="تعديل المتبرع" subtitle={`تحديث بيانات ${donor.name}`}>
      <DonorForm
        initial={{
          name: donor.name,
          phone: donor.phone,
          area: donor.area,
          monthlyAmount: donor.monthlyAmount,
          notes: donor.notes ?? "",
        }}
        submitLabel="حفظ التعديلات"
        onSubmit={(values) => {
          updateDonor(donor.id, values);
          toast.success("تم تحديث بيانات المتبرع");
          navigate({ to: "/donors/$donorId", params: { donorId: donor.id } });
        }}
      />
    </AppShell>
  );
}
