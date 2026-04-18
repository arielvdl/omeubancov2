import InviteClient from "./InviteClient";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ inviteCode: "placeholder" }];
}

export default function InvitePage() {
  return <InviteClient />;
}
