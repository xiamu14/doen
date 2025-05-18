import DialogProvider from "@/components/Dialog/provider";
import Container from "@/components/layouts/container";

export default function Page() {
  return (
    <DialogProvider>
      <Container className="flex justify-center items-center"></Container>;
    </DialogProvider>
  );
}
