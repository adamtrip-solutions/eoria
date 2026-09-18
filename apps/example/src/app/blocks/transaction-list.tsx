import { Stack } from 'expo-router'
import { TransactionList } from '@/components/blocks/transaction-list'
import { toast } from '@/components/ui/toast'
import { transactions } from '@/previews/blocks-app'

export default function TransactionListDemo() {
  return (
    <>
      <Stack.Screen options={{ title: 'Transactions' }} />
      <TransactionList
        insetTop={false}
        transactions={transactions}
        currency="EUR"
        locale="en-IE"
        onPressTransaction={(transaction) => toast({ title: transaction.title })}
      />
    </>
  )
}
