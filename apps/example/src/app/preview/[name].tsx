import { Stack, useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { blockPreviews, previews } from '@/previews'
import { Text } from '@/components/ui/text'

// Headerless canvas used by apps/docs/scripts/capture-previews.mjs.
export default function PreviewScreen() {
  const { name } = useLocalSearchParams<{ name: string }>()
  const block = name ? blockPreviews[name] : undefined
  const render = name ? previews[name] : undefined
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {block ? (
        // A block is a screen, so it gets the whole window and handles its own insets.
        <View style={styles.screen}>{block()}</View>
      ) : (
        <View style={styles.canvas}>
          {render ? render() : <Text variant="muted">No preview named {name}</Text>}
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  canvas: {
    flex: 1,
    paddingTop: rt.insets.top + 128,
    paddingHorizontal: theme.space[5],
    backgroundColor: theme.colors.background,
  },
}))
