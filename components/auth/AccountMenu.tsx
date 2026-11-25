import { currentPlayer } from "@/server/auth/session";
import { getProfileSettings } from "@/app/auth/profile";
import { LoginButton } from "./LoginButton";
import { ProfileSettings } from "./ProfileSettings";

export async function AccountMenu() {
  const player = await currentPlayer();
  if (!player) return <LoginButton />;
  const profile = await getProfileSettings();
  return <div className="account"><ProfileSettings key={player.id} initial={profile}/></div>;
}
