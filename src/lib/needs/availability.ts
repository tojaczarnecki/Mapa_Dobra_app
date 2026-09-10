export type NeedSignupAvailabilityInput = {
  status: string;
  endsAt: Date;
  signupDeadline?: Date | null;
};

export type NeedSignupAvailability = {
  open: boolean;
  reason?: "NOT_PUBLISHED" | "ENDED" | "SIGNUP_DEADLINE_PASSED";
};

/**
 * Public volunteer signup is available only while the need is published,
 * the activity has not ended and the optional signup deadline is still ahead.
 * At the exact deadline/end timestamp signup is closed.
 */
export function resolveNeedSignupAvailability(
  need: NeedSignupAvailabilityInput,
  now = new Date(),
): NeedSignupAvailability {
  if (need.status !== "PUBLISHED") {
    return { open: false, reason: "NOT_PUBLISHED" };
  }

  if (need.endsAt.getTime() <= now.getTime()) {
    return { open: false, reason: "ENDED" };
  }

  if (need.signupDeadline && need.signupDeadline.getTime() <= now.getTime()) {
    return { open: false, reason: "SIGNUP_DEADLINE_PASSED" };
  }

  return { open: true };
}

export function needSignupClosedMessage(reason: NeedSignupAvailability["reason"]) {
  switch (reason) {
    case "SIGNUP_DEADLINE_PASSED":
      return "Zapisy do tej potrzeby zostały zakończone.";
    case "ENDED":
      return "Ta potrzeba już się zakończyła.";
    case "NOT_PUBLISHED":
      return "Ta potrzeba nie przyjmuje teraz zgłoszeń.";
    default:
      return "Ta potrzeba nie przyjmuje teraz zgłoszeń.";
  }
}
