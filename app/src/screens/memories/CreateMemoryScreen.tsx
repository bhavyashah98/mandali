import React, { useState } from 'react';
import { useIsTablet } from '../../hooks/useIsTablet';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Dimensions, ActivityIndicator, Alert, Platform, useWindowDimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { uploadImage, createMemory, fetchGroupDetail } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';

const CreateMemoryScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const queryClient = useQueryClient();
    const { width } = useWindowDimensions();
    const isTablet = useIsTablet();
    const GRID_SIZE = isTablet ? (width - 120 - 48) / 3 : (width - 48 - 24) / 3;
    const { groupId } = (route.params as { groupId: string }) || {};

    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [story, setStory] = useState('');
    const [memoryDate, setMemoryDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
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
            // 0. Auto-compress images aggressively to ensure they are well under 1MB
            const compressedImages = await Promise.all(selectedImages.map(async (uri) => {
                const result = await manipulateAsync(
                    uri,
                    [{ resize: { width: 1200 } }], // Downscale to 1200px (WhatsApp-style)
                    { compress: 0.6, format: SaveFormat.JPEG } // 60% quality
                );
                return result.uri;
            }));

            const uploadPromises = compressedImages.map(uri => uploadImage(uri, groupId!));
            const imageResults = await Promise.all(uploadPromises);


            const createPromises = imageResults.map(result => createMemory({
                groupId: groupId!,
                imageUrls: [result.url],
                story,
                memoryDate
            }));

            await Promise.all(createPromises);

            queryClient.invalidateQueries({ queryKey: ['memories', groupId] });

            Alert.alert('Moment Preserved', 'Your story has been added to the Mandali Memories', [
                { text: 'View Memories', onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            Alert.alert('Upload Failed', 'We couldn\'t capture this moment. Please try again.');
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <View className="flex-1 bg-[#fdf9f3]">
            <SafeAreaView edges={['top']} className="bg-[#fdf9f3]" />

            {/* Header */}
            <View className={`flex-row items-center px-6 ${isTablet ? 'py-8' : 'py-4'}`}>
                <View style={{ width: isTablet ? 64 : 40 }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className={`items-center justify-center rounded-full bg-white shadow-sm border border-stone-100 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}
                    >
                        <MaterialIcons name="arrow-back-ios" size={isTablet ? 28 : 20} color="#b30069" style={{ marginLeft: isTablet ? 12 : 5 }} />
                    </TouchableOpacity>
                </View>

                <View className="flex-1 items-center">
                    <Text
                        className="font-headline-bold text-on-surface text-[#1c1c18]"
                        style={{ fontSize: isTablet ? 36 : 22 }}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        Preserve a Moment
                    </Text>
                </View>

                <View style={{ width: isTablet ? 64 : 40 }} />
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View className={isTablet ? 'p-12' : 'p-6'}>
                    <View className="flex-row items-center justify-between mb-8">
                        <View className="flex-1" />
                        {selectedImages.length > 0 && (
                            <View className={`bg-[#fad4e8] rounded-full ${isTablet ? 'px-6 py-2' : 'px-3 py-1'}`}>
                                <Text className={`text-[#b30069] font-body-bold uppercase tracking-widest ${isTablet ? 'text-sm' : 'text-[10px]'}`}>{selectedImages.length} selected</Text>
                            </View>
                        )}
                    </View>

                    {/* Image Selector Grid */}
                    <View className={`flex-row flex-wrap ${isTablet ? 'gap-6' : 'gap-3'}`}>
                        {/* Gallery Trigger */}
                        <TouchableOpacity
                            onPress={pickImages}
                            className={`bg-white border-2 border-dashed border-stone-200 rounded-[32px] items-center justify-center`}
                            style={{
                                width: selectedImages.length === 0 ? (isTablet ? width - 120 : width - 48) : GRID_SIZE,
                                height: selectedImages.length === 0 ? (isTablet ? 300 : 180) : GRID_SIZE
                            }}
                        >
                            <View className={`rounded-full bg-[#fde8f3] items-center justify-center mb-6 ${isTablet ? 'w-24 h-24' : 'w-10 h-10'}`}>
                                <MaterialIcons name="add-a-photo" size={isTablet ? 48 : 20} color="#b30069" />
                            </View>
                            <Text className={`text-stone-400 font-body-bold uppercase tracking-widest text-center ${isTablet ? 'text-xl' : 'text-[10px]'}`}>Add Photos</Text>
                        </TouchableOpacity>
                        {/* Selected Previews */}
                        {selectedImages.map((uri, idx) => (
                            <View key={idx} style={{ width: GRID_SIZE, height: GRID_SIZE }} className="rounded-[32px] overflow-hidden bg-stone-100 shadow-sm border border-white">
                                <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                                <TouchableOpacity
                                    onPress={() => removeImage(idx)}
                                    className={`absolute top-2 right-2 rounded-full bg-black/40 items-center justify-center ${isTablet ? 'w-10 h-10' : 'w-6 h-6'}`}
                                >
                                    <Ionicons name="close" size={isTablet ? 24 : 16} color="white" />
                                </TouchableOpacity>
                                <View className={`absolute bottom-3 right-3 bg-white rounded-full items-center justify-center ${isTablet ? 'w-8 h-8' : 'w-5 h-5'}`}>
                                    <Ionicons name="checkmark-circle" size={isTablet ? 24 : 14} color="#b30069" />
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Story Input */}
                    <View className="mt-10">
                        <Text className={`text-[#594048] font-headline-bold mb-6 ${isTablet ? 'text-4xl' : 'text-lg'}`}>The Story Behind the Moment</Text>
                        <View
                            className="bg-white rounded-[32px] p-8 shadow-sm border border-stone-100"
                            style={{ minHeight: isTablet ? 300 : 120 }}
                        >
                            <TextInput
                                className="text-[#594048] font-body-medium"
                                style={{ fontSize: isTablet ? 28 : 16, lineHeight: isTablet ? 42 : 24 }}
                                placeholder="What's the story behind this moment?"
                                placeholderTextColor="#a09d96"
                                value={story}
                                onChangeText={setStory}
                                textAlignVertical="top"
                                multiline={true}
                            />
                            <View className="absolute bottom-8 right-8">
                                <Text className={`text-stone-300 font-body-bold uppercase ${isTablet ? 'text-sm' : 'text-[10px]'}`}>{group?.group?.name || 'Group'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Date Selector */}
                    <View className="mt-12">
                        <Text className={`text-[#594048] font-headline-bold mb-6 ${isTablet ? 'text-4xl' : 'text-lg'}`}>When did this happen?</Text>
                        <TouchableOpacity
                            onPress={() => setShowDatePicker(true)}
                            activeOpacity={0.7}
                            style={{ height: isTablet ? 110 : 64 }}
                            className="bg-white rounded-full flex-row items-center px-8 shadow-sm border border-stone-100"
                        >
                            <View className={`rounded-full bg-[#e8f3fe] items-center justify-center mr-6 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}>
                                <MaterialIcons name="event" size={isTablet ? 32 : 20} color="#0057b3" />
                            </View>
                            <Text className={`text-[#594048] font-body-bold flex-1 ${isTablet ? 'text-2xl' : 'text-base'}`}>
                                {memoryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </Text>
                            <MaterialIcons name="chevron-right" size={isTablet ? 32 : 20} color="#a09d96" />
                        </TouchableOpacity>

                        {Platform.OS === 'ios' ? (
                            <Modal
                                visible={showDatePicker}
                                transparent={true}
                                animationType="fade"
                                onRequestClose={() => setShowDatePicker(false)}
                            >
                                <View 
                                    style={{ flex: 1, backgroundColor: 'rgba(28, 28, 24, 0.4)' }} 
                                    className="justify-end"
                                >
                                    <View className="bg-white rounded-t-[40px] p-8 pb-12">
                                        <View className="flex-row justify-between items-center mb-6">
                                            <Text className="text-[#1c1c18] font-headline-bold text-2xl">Select Date</Text>
                                            <TouchableOpacity 
                                                onPress={() => setShowDatePicker(false)}
                                                className="bg-stone-100 p-2 rounded-full"
                                            >
                                                <MaterialIcons name="close" size={24} color="#594048" />
                                            </TouchableOpacity>
                                        </View>
                                        
                                        <DateTimePicker
                                            value={memoryDate}
                                            mode="date"
                                            display="spinner"
                                            maximumDate={new Date()}
                                            onChange={(event, selectedDate) => {
                                                if (selectedDate) setMemoryDate(selectedDate);
                                            }}
                                            textColor="#1c1c18"
                                        />

                                        <TouchableOpacity
                                            onPress={() => setShowDatePicker(false)}
                                            className="bg-[#b30069] rounded-full h-16 items-center justify-center mt-6 shadow-lg shadow-[#b30069]/20"
                                        >
                                            <Text className="text-white font-headline-bold text-lg">Confirm Date</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </Modal>
                        ) : showDatePicker && (
                            <DateTimePicker
                                value={memoryDate}
                                mode="date"
                                display="calendar"
                                maximumDate={new Date()}
                                onChange={(event, selectedDate) => {
                                    setShowDatePicker(false);
                                    if (selectedDate) setMemoryDate(selectedDate);
                                }}
                            />
                        )}
                    </View>

                    <View className="mt-12 flex-row items-center px-4">
                        <View className={`rounded-full bg-[#fdf2d0] items-center justify-center mr-6 ${isTablet ? 'w-16 h-16' : 'w-10 h-10'}`}>
                            <Ionicons name="people" size={isTablet ? 32 : 20} color="#b38b00" />
                        </View>
                        <Text className={`text-stone-400 font-body-medium flex-1 ${isTablet ? 'text-2xl' : 'text-base'}`}>
                            This will be shared with <Text className="font-body-bold text-[#b30069]">{group?.group?.name || 'the Mandali'}</Text>
                        </Text>
                    </View>

                </View>
                <View className="h-20" />
            </ScrollView>

            {/* Footer Action */}
            <View className={`bg-white border-t border-stone-100 ${isTablet ? 'p-12' : 'p-6'}`}>
                <TouchableOpacity
                    onPress={handleUpload}
                    disabled={isUploading}
                    style={{ height: isTablet ? 110 : 64 }}
                    className="bg-[#b30069] rounded-[32px] flex-row items-center justify-center shadow-lg shadow-[#b30069]/30"
                >
                    {isUploading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Ionicons name="sparkles" size={isTablet ? 32 : 20} color="white" />
                            <Text
                                className="text-white font-headline-bold ml-4"
                                style={{ fontSize: isTablet ? 32 : 20 }}
                            >Upload to Memories</Text>
                        </>
                    )}
                </TouchableOpacity>
                <SafeAreaView edges={['bottom']} />
            </View>
        </View>
    );
};

export default CreateMemoryScreen;
