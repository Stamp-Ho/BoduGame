import DiceArena from "./components/DiceArena";

export default function BoardGameMain({ role }: { role: string | null }) {
  return (
    <main className="shell">
      <div className="w-full space-y-6">
        <DiceArena role={role} />
      </div>
    </main>
  );
}
