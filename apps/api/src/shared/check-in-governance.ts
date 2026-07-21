export function checkInRevocationAllowed(input: { checkedInAt: Date; now?: Date; maxMinutes: number; isSuperAdmin: boolean }) {
  const ageMinutes = ((input.now || new Date()).getTime() - input.checkedInAt.getTime()) / 60000;
  return input.isSuperAdmin || ageMinutes <= input.maxMinutes;
}
