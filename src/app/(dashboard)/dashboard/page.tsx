import { getUser } from "@/lib/auth-utils";

export default async function DashboardPage() {
    const user = await getUser();
    return (
        <div className="flex flex-col h-screen w-screen items-center">
            <div className="flex flex-col items-center justify-center">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">{user?.email}</p>
            </div>
            <pre>
                {JSON.stringify(user, null, 2)}
            </pre>
        </div>
    )
}