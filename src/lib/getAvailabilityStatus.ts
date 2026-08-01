// labelKey matches a key under the "Availability" namespace in
// messages/{locale}.json — callers translate it with useTranslations
// rather than displaying it directly, since this is a plain (non-component)
// helper with no access to the translation hook itself.
export function getAvailabilityStatus({
  availableSeats,
  totalSeats,
}: {
  availableSeats: number
  totalSeats: number
}) {
  if (availableSeats <= 0) {
    return {
      labelKey: 'fully_booked' as const,
      color: 'bg-red-100 text-red-600',
      dot: 'bg-red-500',
    }
  }

  const ratio =
    availableSeats / totalSeats

  if (ratio <= 0.3) {
    return {
      labelKey: 'few_seats_left' as const,
      color: 'bg-yellow-100 text-yellow-700',
      dot: 'bg-yellow-500',
    }
  }

  return {
    labelKey: 'available' as const,
    color: 'bg-green-100 text-green-600',
    dot: 'bg-green-500',
  }
}