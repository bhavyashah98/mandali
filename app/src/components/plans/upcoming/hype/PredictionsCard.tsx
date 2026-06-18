import React from 'react';
import { Text, View } from 'react-native';
import type { HypeMember, HypePredictionQuestion, HypePredictionVote } from '../../../../types/planHype';
import HypeCard from './HypeCard';
import HypeMemberPicker from './HypeMemberPicker';

interface Props {
    members: HypeMember[];
    questions: HypePredictionQuestion[];
    votes: HypePredictionVote[];
    currentUserId?: string;
    onVote: (questionId: string, targetUserId: string) => void;
}

export default function PredictionsCard({ members, questions, votes, currentUserId, onVote }: Props) {
    return (
        <HypeCard icon="🔮" title="Predictions & Bets" subtitle="Purely for fun. No money, only audacity.">
            {questions.map((question) => {
                const selected = votes.filter((v) => v.questionId === question.id && v.voterId === currentUserId).map((v) => v.targetUserId);
                const poll = members.map((m) => ({ ...m, votes: votes.filter((v) => v.questionId === question.id && v.targetUserId === m.id) })).filter((m) => m.votes.length > 0);
                return (
                    <View key={question.id} className="mb-3">
                        <Text className="mb-3 font-body-bold text-sm text-[#594048]">{question.question}</Text>
                        <HypeMemberPicker members={members} selectedIds={selected} selectionType={question.selectionType} onToggle={(id) => onVote(question.id, id)} />
                        {poll.length > 0 && <Text className="mb-3 mt-5 font-body-bold text-sm text-[#594048]">Poll</Text>}
                        {poll.map((member) => (
                            <View key={member.id} className="mb-3 rounded-2xl bg-[#fff8fb] px-4 py-3">
                                <View className="flex-row items-center justify-between">
                                    <Text className="font-body-bold text-sm text-[#1c1c18]">{member.name}</Text>
                                    <Text className="font-body-bold text-xs text-[#b30069]">{member.votes.length} vote{member.votes.length === 1 ? '' : 's'}</Text>
                                </View>
                                <Text className="mt-1 font-body-medium text-xs text-[#8a7a80]">{member.votes.map((vote) => vote.voterName).join(', ')}</Text>
                            </View>
                        ))}
                    </View>
                );
            })}
        </HypeCard>
    );
}
