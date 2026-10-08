"use client";
import type { PicAreaKey } from "@/components/providers/RoleProvider";
import type { Role } from "@/types/morningMeeting";
import HostFollowupBoard from "@/features/morning-meeting/HostFollowupBoard";

type FollowupPageProps = { role: Role; picArea: PicAreaKey };

export default function FollowupPage(_props: FollowupPageProps) {
  void _props;
  return <HostFollowupBoard />;
}
