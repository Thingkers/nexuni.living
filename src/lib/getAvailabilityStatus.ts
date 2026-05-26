export function getAvailabilityStatus({
  availableSeats,
  totalSeats,
}: {
  availableSeats: number
  totalSeats: number
}) {
  if (availableSeats <= 0) {
    return {
      label: 'Fully Booked',
      color: 'bg-red-100 text-red-600',
      emoji: '🔴',
    }
  }

  const ratio =
    availableSeats / totalSeats

  if (ratio <= 0.3) {
    return {
      label: 'Few Seats Left',
      color: 'bg-yellow-100 text-yellow-700',
      emoji: '🟡',
    }
  }

  return {
    label: 'Available',
    color: 'bg-green-100 text-green-600',
    emoji: '🟢',
  }
}