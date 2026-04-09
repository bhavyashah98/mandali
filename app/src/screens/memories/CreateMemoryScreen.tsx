import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage, createMemory, fetchGroupDetail } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - 48 - 24) / 3;

const CreateMemoryScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const queryClient = useQueryClient();
    const { groupId } = (route.params as { groupId: string }) || {};

    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [story, setStory] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const { data: group } = useQuery({
        queryKey: ['groupDetail', groupId],
        queryFn: () => fetchGroupDetail(groupId!),
        enabled: !!groupId,
    });

    const pickImages = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: 5,
            quality: 0.8,
        });

        if (!result.canceled) {
            const uris = result.assets.map(asset => asset.uri);
            setSelectedImages([...selectedImages, ...uris].slice(0, 5));
        }
    };

    const removeImage = (index: number) => {
        setSelectedImages(selectedImages.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (selectedImages.length === 0) {
            Alert.alert('Selection Required', 'Please select at least one moment to preserve.');
            return;
        }

        setIsUploading(true);
        try {
            // 1. Upload all images in parallel
            const uploadPromises = selectedImages.map(uri => uploadImage(uri));
            const imageUrls = await Promise.all(uploadPromises);

            // 2. Create memory record
            await createMemory({
                groupId,
                imageUrls,
                story
            });

            queryClient.invalidateQueries({ queryKey: ['memories', groupId] });
            
            Alert.alert('Moment Preserved', 'Your story has been added to the Mandali hearth.', [
                { text: 'View Gallery', onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            Alert.alert('Upload Failed', 'We couldn\'t capture this moment. Please try again.');
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            {/* Header */}
            <View className="px-6 py-4 flex-row items-center border-b border-stone-100/50">
                <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-full bg-white shadow-sm">
                    <MaterialIcons name="arrow-back-ios" size={18} color="#b30069" style={{ marginLeft: 5 }} />
                </TouchableOpacity>
                <Text className="text-[#b30069] font-headline-bold text-xl ml-4">Add to Hearth</Text>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View className="p-6">
                    <View className="flex-row items-center justify-between mb-6">
                        <Text className="text-[#594048] font-headline-bold text-lg">Preserve a Moment</Text>
                        {selectedImages.length > 0 && (
                            <View className="bg-[#fad4e8] px-3 py-1 rounded-full">
                                <Text className="text-[#b30069] font-body-bold text-[10px] uppercase tracking-widest">{selectedImages.length} selected</Text>
                            </View>
                        )}
                    </View>

                    {/* Image Selector Grid */}
                    <View className="flex-row flex-wrap gap-3">
                        {/* Gallery Trigger */}
                        <TouchableOpacity 
                            onPress={pickImages}
                            className="bg-white border-2 border-dashed border-stone-200 rounded-[32px] items-center justify-center"
                            style={{ width: selectedImages.length === 0 ? width - 48 : GRID_SIZE, height: selectedImages.length === 0 ? 240 : GRID_SIZE }}
                        >
                            <View className="w-12 h-12 rounded-full bg-[#fde8f3] items-center justify-center mb-2">
                                <MaterialIcons name="add-a-photo" size={24} color="#b30069" />
                            </View>
                            <Text className="text-stone-400 font-body-bold text-xs uppercase tracking-widest">Gallery</Text>
                        </TouchableOpacity>
                        {/* Selected Previews */}
                        {selectedImages.map((uri, idx) => (
                            <View key={idx} style={{ width: GRID_SIZE, height: GRID_SIZE }} className="rounded-[24px] overflow-hidden bg-stone-100 shadow-sm border border-white">
                                <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                                <TouchableOpacity 
                                    onPress={() => removeImage(idx)}
                                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/40 items-center justify-center"
                                >
                                    <Ionicons name="close" size={16} color="white" />
                                </TouchableOpacity>
                                <View className="absolute bottom-2 right-2 bg-white/80 rounded-full w-5 h-5 items-center justify-center">
                                     <Ionicons name="checkmark-circle" size={14} color="#b30069" />
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Story Input */}
                    <View className="mt-10">
                        <Text className="text-[#594048] font-headline-bold text-lg mb-4">The Story Behind the Moment</Text>
                        <View className="bg-white rounded-[32px] p-6 shadow-sm border border-stone-100 min-h-[160px]">
                            <TextInput
                                multiline
                                placeholder="Write a story..."
                                placeholderTextColor="#a09d96"
                                className="text-[#594048] font-body-medium text-base leading-6"
                                value={story}
                                onChangeText={setStory}
                                textAlignVertical="top"
                            />
                            <View className="absolute bottom-6 right-6">
                                <Text className="text-stone-300 font-body-bold text-[10px] uppercase">{group?.group?.name || 'Group'}</Text>
                            </View>
                        </View>
                    </View>

                    <View className="mt-8 flex-row items-center px-2">
                        <View className="w-10 h-10 rounded-full bg-[#fdf2d0] items-center justify-center mr-4">
                           <Ionicons name="people" size={20} color="#b38b00" />
                        </View>
                        <Text className="text-stone-400 font-body-medium flex-1">
                            This will be shared with <Text className="text-[#594048] font-body-bold">{group?.group?.name || 'the Mandali'}</Text>
                        </Text>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity 
                        onPress={handleUpload}
                        disabled={isUploading}
                        className="mt-12 bg-[#b30069] h-16 rounded-full flex-row items-center justify-center shadow-lg shadow-[#b30069]/30"
                    >
                        {isUploading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Ionicons name="sparkles" size={20} color="white" />
                                <Text className="text-white font-headline-bold text-xl ml-3">Upload to Hearth</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default CreateMemoryScreen;
