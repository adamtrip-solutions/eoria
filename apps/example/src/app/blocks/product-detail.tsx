import { useRef, useState } from 'react'
import { Stack, router } from 'expo-router'
import { ProductDetail } from '@/components/blocks/product-detail'
import { toast } from '@/components/ui/toast'
import { product } from '@/previews/blocks-commerce'

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export default function ProductDetailDemo() {
  const [value, setValue] = useState<string | undefined>('m')
  const [favourite, setFavourite] = useState(false)
  const attempts = useRef(0)
  return (
    <>
      <Stack.Screen options={{ title: 'Product detail' }} />
      <ProductDetail
        {...product}
        insetTop={false}
        value={value}
        onValueChange={setValue}
        favourite={favourite}
        onToggleFavourite={() => {
          setFavourite((current) => !current)
          toast({ title: favourite ? 'Removed from favourites' : 'Saved to favourites' })
        }}
        onBack={() => router.back()}
        onShare={async () => {
          await wait(500)
          toast({ title: 'Share product', description: 'Connect your share flow here.' })
        }}
        onAddToCart={async ({ quantity, option }) => {
          await wait(1000)
          attempts.current += 1
          if (attempts.current === 1) throw new Error('The cart could not be updated. Try again.')
          toast({
            title: 'Added to cart',
            description: `${quantity} × ${product.title}, size ${option?.toUpperCase()}`,
          })
        }}
      />
    </>
  )
}
