export interface HypeMember {
    id: string;
    name: string;
    avatarUrl?: string | null;
}

export interface HypeOutfit {
    userId: string;
    name: string;
    text: string;
}

export interface HypeReactionCount {
    emoji: string;
    count: number;
}

export interface HypeShoutout {
    id: string;
    userId: string;
    name: string;
    message: string;
    myReaction?: string | null;
    reactions: HypeReactionCount[];
}

export interface HypeShowVote {
    voter_id: string;
    target_user_id: string;
    vote: boolean;
}

export interface HypeCancelBet {
    voterId: string;
    voterName: string;
    targetUserId: string;
    targetName: string;
}

export interface HypePredictionQuestion {
    id: string;
    question: string;
    selectionType: 'single_select' | 'multi_select';
}

export interface HypePredictionVote {
    questionId: string;
    voterId: string;
    voterName: string;
    targetUserId: string;
    targetName: string;
}

export interface HypeFeedItem {
    at: string;
    text: string;
}

export interface PlanHypeData {
    dressCode?: string | null;
    predictionQuestions: HypePredictionQuestion[];
    predictionVotes: HypePredictionVote[];
    members: HypeMember[];
    outfits: HypeOutfit[];
    shoutouts: HypeShoutout[];
    showVotes: HypeShowVote[];
    cancelBets: HypeCancelBet[];
    feed: HypeFeedItem[];
}
