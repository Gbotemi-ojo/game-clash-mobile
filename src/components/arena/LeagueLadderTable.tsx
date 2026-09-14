import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { styles } from '../../styles/tournaments.styles';

interface LeagueLadderTableProps {
  ladder: any[];
  myUserId: string | null;
}

export default function LeagueLadderTable({ ladder, myUserId }: LeagueLadderTableProps) {
  const router = useRouter();

  return (
    <View style={styles.tableWrapper}>
      <View style={styles.fixedLeftCol}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderText, { width: 30, textAlign: 'center' }]}>#</Text>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>CLUB</Text>
        </View>
        
        {ladder.map((row: any, idx: number) => {
          const isMe = row.userId === myUserId;
          return (
            <TouchableOpacity 
              key={`left-${idx}`} 
              style={[styles.tableDataRow, isMe && styles.highlightRow]}
              onPress={() => router.push({ pathname: '/player/[id]', params: { id: row.userId } } as any)}
              activeOpacity={0.7}
            >
              <Text style={[styles.rankText, isMe && { color: '#f59e0b' }]}>{idx + 1}</Text>
              <Text style={[styles.clubText, isMe && { fontWeight: 'bold', color: '#fff' }]} numberOfLines={1}>
                {row.gamerTag || row.clubName || 'Unknown Player'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollingRightCol}>
        <View>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.statHeaderCell}>MP</Text>
            <Text style={styles.statHeaderCell}>W</Text>
            <Text style={styles.statHeaderCell}>L</Text>
            <Text style={styles.statHeaderCell}>GF</Text>
            <Text style={styles.statHeaderCell}>GA</Text>
            <Text style={styles.statHeaderCell}>GD</Text>
            <Text style={[styles.statHeaderCell, { color: '#22d3ee', fontWeight: '900' }]}>PTS</Text>
          </View>

          {ladder.map((row: any, idx: number) => {
            const isMe = row.userId === myUserId;
            return (
              <View key={`right-${idx}`} style={[styles.tableDataRow, isMe && styles.highlightRow]}>
                <Text style={styles.statCell}>{row.played || row.matchesPlayed || 0}</Text>
                <Text style={styles.statCell}>{row.wins || 0}</Text>
                <Text style={styles.statCell}>{row.losses || 0}</Text>
                <Text style={styles.statCell}>{row.goalsFor || 0}</Text>
                <Text style={styles.statCell}>{row.goalsAgainst || 0}</Text>
                <Text style={styles.statCell}>{row.goalDifference > 0 ? `+${row.goalDifference}` : (row.goalDifference || 0)}</Text>
                <Text style={[styles.statCell, { color: '#22d3ee', fontWeight: 'bold' }]}>{row.points || 0}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
