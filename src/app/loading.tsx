import { IkatLoader } from "@/components/IkatLoader";

export default function Loading() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-bg">
      <IkatLoader size={34} />
    </div>
  );
}
