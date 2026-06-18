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
import * as FileSystem from 'expo-file-system';
import { router } from 'expo-router';
import { setImage, getStore } from '@/lib/store';

const BRAND = '#2D4A1E';

type PickedImage = {
  uri: string;
  base64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
};

export default function HomeScreen() {
  const store = getStore();
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(
    store.imageUri && store.imageBase64
      ? { uri: store.imageUri, base64: store.imageBase64, mediaType: store.imageMediaType }
      : null
  );
  const [reading, setReading] = useState(false);

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
      ? await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.85 });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop()?.toLowerCase();
      const mediaType =
        ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

      setReading(true);
      try {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setPickedImage({ uri: asset.uri, base64, mediaType });
      } catch (e) {
        Alert.alert('Error', 'Could not read the selected photo. Please try again.');
      } finally {
        setReading(false);
      }
    }
  }

  function goToIngredients() {
    if (!pickedImage) return;
    setImage(pickedImage.base64, pickedImage.uri, pickedImage.mediaType);
    router.push('/ingredients');
  }

  return (
    <View style={styles.container}>
      {reading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={styles.loadingText}>Loading photo…</Text>
        </View>
      )}
      <View style={styles.header}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>
          Everything in its place.{'\n'}Snap your ingredients, find your recipe.
        </Text>
      </View>

      {pickedImage ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: pickedImage.uri }} style={styles.preview} />
          <Pressable style={styles.changeButton} onPress={() => { setPickedImage(null); setImage('', '', 'image/jpeg'); }}>
            <Text style={styles.changeButtonText}>Change photo</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.uploadArea} onPress={() => pickImage(false)}>
          <Text style={styles.uploadIcon}>&#x1F4F7;</Text>
          <Text style={styles.uploadTitle}>Add a photo of your ingredients</Text>
          <Text style={styles.uploadSubtitle}>
            Lay everything out on a counter for best results
          </Text>
        </Pressable>
      )}

      <View style={styles.actions}>
        {!pickedImage && (
          <Pressable style={styles.btnSecondary} onPress={() => pickImage(true)}>
            <Text style={styles.btnSecondaryText}>Take a photo</Text>
          </Pressable>
        )}
        {!pickedImage && (
          <Pressable style={styles.btnPrimary} onPress={() => pickImage(false)}>
            <Text style={styles.btnPrimaryText}>Choose from library</Text>
          </Pressable>
        )}
        {pickedImage && (
          <Pressable style={styles.btnPrimary} onPress={goToIngredients}>
            <Text style={styles.btnPrimaryText}>Continue</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 36,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 16,
    color: '#6B6B6B',
    lineHeight: 24,
    fontWeight: '400',
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245, 240, 232, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: BRAND,
    fontWeight: '600',
  },
  uploadArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    marginBottom: 20,
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: 14,
  },
  uploadTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 21,
  },
  previewContainer: {
    flex: 1,
    marginBottom: 20,
  },
  preview: {
    flex: 1,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
  },
  changeButton: {
    alignSelf: 'center',
    paddingVertical: 10,
  },
  changeButtonText: {
    fontSize: 14,
    color: BRAND,
    fontWeight: '600',
  },
  actions: {
    gap: 10,
  },
  btnPrimary: {
    backgroundColor: BRAND,
    paddingVertical: 16,
    borderRadius: 4,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  btnSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    paddingVertical: 15,
    borderRadius: 4,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '600',
  },
});
