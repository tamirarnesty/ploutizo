import { Text } from "@ploutizo/ui/components/text"

export const Dashboard = () => {
  return (
    <div>
      <Text as="h1" variant="h3" className="mb-4">Dashboard</Text>
      <p className="text-sm text-muted-foreground">
        Your financial overview will appear here once you've added accounts
        and transactions.
      </p>
    </div>
  )
}
