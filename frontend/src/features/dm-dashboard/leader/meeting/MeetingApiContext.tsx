"use client";

import { createContext, useContext } from "react";
import { meetingApi, type MeetingApi } from "../../api";

const MeetingApiContext = createContext<MeetingApi>(meetingApi);

export const MeetingApiProvider = MeetingApiContext.Provider;

export function useMeetingApi(): MeetingApi {
  return useContext(MeetingApiContext);
}
