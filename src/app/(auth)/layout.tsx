import { Goku } from "@/app/(marketing)/page";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between h-screen">
            <div className="w-1/2 h-full bg-black">
                <Goku />
            </div>
            <div className="w-1/2 h-full flex items-center justify-center">
                {children}
            </div>
        </div>
    );
}