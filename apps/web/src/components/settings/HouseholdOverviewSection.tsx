import { Avatar, AvatarFallback, AvatarImage } from "@ploutizo/ui/components/avatar"
import { Skeleton } from "@ploutizo/ui/components/skeleton"
import { Text } from "@ploutizo/ui/components/text"
import { useGetHouseholdOverview } from "@/lib/data-access/household"

export const HouseholdOverviewSection = () => {
  const { data: overview, isLoading } = useGetHouseholdOverview()

  return (
    <section className="flex flex-col gap-3">
      <Text as="h2" variant="h3">Household</Text>
      {isLoading ? (
        <Skeleton className="h-10 w-48" />
      ) : (
        <div className="flex items-center gap-3">
          <Avatar className="size-10">
            <AvatarImage src={overview?.imageUrl ?? undefined} />
            <AvatarFallback>
              {overview?.name?.charAt(0).toUpperCase() ?? "H"}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-semibold">{overview?.name ?? "—"}</span>
        </div>
      )}
    </section>
  )
}
