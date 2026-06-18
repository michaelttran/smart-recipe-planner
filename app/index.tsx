import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { analyzeIngredientsAndGetRecipes } from '@/lib/claude';
import { setImage, setRecipes } from '@/lib/store';

type PickedImage = {
  uri: string;
  base64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
};

export default function HomeScreen() {
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [loading, setLoading] = useState(false);

  async function pickImage(useCamera: boolean) {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission required',
        `Please allow ${useCamera ? 'camera' : 'photo library'} access in Settings.`
      );
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          base64: true,
        });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop()?.toLowerCase();
      const mediaType =
        ext === 'png'
          ? 'image/png'
          : ext === 'webp'
          ? 'image/webp'
          : 'image/jpeg';

      setPickedImage({
        uri: asset.uri,
        base64: asset.base64 ?? '',
        mediaType,
      });
    }
  }

  async function findRecipes() {
    if (!pickedImage?.base64) return;
    setLoading(true);
    try {
      setImage(pickedImage.base64, pickedImage.uri, pickedImage.mediaType);
      const recipes = await analyzeIngredientsAndGetRecipes(
        pickedImage.base64,
        pickedImage.mediaType
      );
      setRecipes(recipes);
      router.push('/recipes');
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Smart Recipe{'\n'}Planner</Text>
        <Text style={styles.subtitle}>
          Snap a photo of your ingredients and discover recipes you can make
          right now
        </Text>
      </View>

      {pickedImage ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: pickedImage.uri }} style={styles.preview} />
          <Pressable
            style={styles.changeButton}
            onPress={() => setPickedImage(null)}
          >
            <Text style={styles.changeButtonText}>Change Photo</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.pickerContainer}>
          <View style={styles.cameraIcon}>
            <Text style={styles.cameraEmoji}>📷</Text>
          </View>
          <Text style={styles.pickerHint}>
            Take a photo or choose one from your library
          </Text>
          <View style={styles.pickerButtons}>
            <Pressable
              style={[styles.pickerButton, styles.pickerButtonPrimary]}
              onPress={() => pickImage(true)}
            >
              <Text style={styles.pickerButtonPrimaryText}>Take Photo</Text>
            </Pressable>
            <Pressable
              style={[styles.pickerButton, styles.pickerButtonSecondary]}
              onPress={() => pickImage(false)}
            >
              <Text style={styles.pickerButtonSecondaryText}>
                Choose from Library
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {pickedImage && (
        <Pressable
          style={[styles.findButton, loading && styles.findButtonDisabled]}
          onPress={findRecipes}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.findButtonText}>Analyzing ingredients…</Text>
            </View>
          ) : (
            <Text style={styles.findButtonText}>Find Recipes</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf8',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#1a1a1a',
    lineHeight: 46,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  pickerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingVertical: 48,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  cameraIcon: {
    marginBottom: 16,
  },
  cameraEmoji: {
    fontSize: 64,
  },
  pickerHint: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  pickerButtons: {
    width: '100%',
    gap: 12,
  },
  pickerButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  pickerButtonPrimary: {
    backgroundColor: '#F97316',
  },
  pickerButtonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#F97316',
  },
  pickerButtonSecondaryText: {
    color: '#F97316',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
    marginBottom: 24,
  },
  preview: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
  },
  changeButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  changeButtonText: {
    color: '#F97316',
    fontSize: 15,
    fontWeight: '600',
  },
  findButton: {
    backgroundColor: '#F97316',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  findButtonDisabled: {
    backgroundColor: '#fdba74',
  },
  findButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
