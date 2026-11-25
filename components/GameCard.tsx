import Link from "next/link";

type Props = { href: string; name: string; description: string; theme: string };

export function GameCard({ href, name, description, theme }: Props) {
  return <Link href={href} className={`game-card ${theme}`}>
    <h2>{name}</h2><p>{description}</p><span aria-hidden="true">↗</span>
  </Link>;
}
