import { Stack, useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { previews } from '@/previews'
import { Text } from '@/components/ui/text'

// Headerless canvas used by apps/docs/scripts/capture-previews.mjs.
export default function PreviewScreen() {
  const { name } = useLocalSearchParams<{ name: string }>()
  const render = name ? previews[name] : undefined
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.canvas}>
        {render ? render() : <Text variant="muted">No preview named {name}</Text>}
      </View>
    </>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  canvas: {
    flex: 1,
    paddingTop: rt.insets.top + 128,
    paddingHorizontal: theme.space[5],
    backgroundColor: theme.colors.background,
  },
}))
