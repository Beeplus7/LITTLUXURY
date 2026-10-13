import { StatusBar } from 'expo-status-bar'
import { StyleSheet, Text, View } from 'react-native'
import { supabase } from './src/lib/supabase'

export default function App() {
  const ready = Boolean(supabase)

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>LITTLUXURY</Text>
      <Text style={styles.title}>Foundation ready</Text>
      <Text style={styles.meta}>
        Mobile app scaffolded. Shop UI comes next.
        {ready ? ' Supabase client configured.' : ' Add EXPO_PUBLIC_SUPABASE_* to .env.'}
      </Text>
      <StatusBar style="light" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  brand: {
    color: '#c4a574',
    letterSpacing: 6,
    fontSize: 13,
    marginBottom: 12,
  },
  title: {
    color: '#f5f0e8',
    fontSize: 28,
    marginBottom: 10,
  },
  meta: {
    color: '#b8b0a4',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
})
