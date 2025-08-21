/**
 * temporal.ts
 * Temporal Marker Extraction and Processing
 * Implements intelligent extraction and processing of temporal information from text
 */

import type { Atom, Chunk } from '../types.js';

export interface TemporalMarker {
	id: string;
	text: string;
	type: TemporalType;
	value: Date | DateRange | RelativeTime;
	confidence: number;
	metadata: {
		normalized: string;
		context: string;
		provenance: {
			offset: number;
			length: number;
		};
		[key: string]: unknown;
	};
}

export type TemporalType = 
	| 'absolute_date'      // Specific dates like "2024-01-15"
	| 'absolute_time'      // Specific times like "14:30"
	| 'relative_date'      // Relative dates like "yesterday", "next week"
	| 'relative_time'      // Relative times like "in 2 hours"
	| 'duration'           // Time durations like "3 days", "2 weeks"
	| 'frequency'          // Recurring patterns like "daily", "monthly"
	| 'seasonal'           // Seasonal references like "summer", "Q1"
	| 'era'                // Historical periods like "Victorian era", "WWII"
	| 'uncertain'          // Uncertain temporal references like "sometime", "maybe"

export interface DateRange {
	start: Date;
	end: Date;
	type: 'exact' | 'approximate' | 'before' | 'after' | 'between';
}

export interface RelativeTime {
	reference: 'now' | 'past' | 'future';
	amount: number;
	unit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
	modifier?: 'ago' | 'from_now' | 'before' | 'after';
}

export interface TemporalExtractionOptions {
	enableAbsoluteDates: boolean;
	enableRelativeDates: boolean;
	enableTimes: boolean;
	enableDurations: boolean;
	enableFrequencies: boolean;
	enableSeasonal: boolean;
	enableEras: boolean;
	minConfidence: number;
	maxMarkersPerChunk: number;
	timezone?: string;
	referenceDate?: Date;
}

export interface TemporalProcessingResult {
	markers: TemporalMarker[];
	normalizedText: string;
	processingTime: number;
	metadata: {
		totalMarkers: number;
		byType: Record<TemporalType, number>;
		confidenceDistribution: {
			high: number;    // 0.8-1.0
			medium: number;  // 0.6-0.79
			low: number;     // 0.4-0.59
		};
	};
}

export class TemporalProcessor {
	constructor(
		private options: TemporalExtractionOptions = {
			enableAbsoluteDates: true,
			enableRelativeDates: true,
			enableTimes: true,
			enableDurations: true,
			enableFrequencies: true,
			enableSeasonal: true,
			enableEras: true,
			minConfidence: 0.6,
			maxMarkersPerChunk: 10,
			timezone: 'UTC',
			referenceDate: new Date()
		}
	) {}

	/**
	 * Extract temporal markers from text chunks
	 */
	async extractTemporalMarkers(chunks: Chunk[]): Promise<TemporalProcessingResult> {
		const startTime = Date.now();
		const allMarkers: TemporalMarker[] = [];

		for (const chunk of chunks) {
			const chunkMarkers = await this.extractFromChunk(chunk);
			allMarkers.push(...chunkMarkers);
		}

		// Filter by confidence and limit
		const filteredMarkers = allMarkers
			.filter(marker => marker.confidence >= this.options.minConfidence)
			.slice(0, this.options.maxMarkersPerChunk);

		// Process and normalize text
		const normalizedText = this.normalizeTextWithMarkers(chunks, filteredMarkers);

		// Calculate metadata
		const metadata = this.calculateMetadata(filteredMarkers);

		return {
			markers: filteredMarkers,
			normalizedText,
			processingTime: Date.now() - startTime,
			metadata
		};
	}

	/**
	 * Extract temporal markers from a single chunk
	 */
	private async extractFromChunk(chunk: Chunk): Promise<TemporalMarker[]> {
		const markers: TemporalMarker[] = [];
		const text = chunk.text;

		// Extract absolute dates
		if (this.options.enableAbsoluteDates) {
			const absoluteDateMarkers = this.extractAbsoluteDates(text, chunk.id);
			markers.push(...absoluteDateMarkers);
		}

		// Extract relative dates
		if (this.options.enableRelativeDates) {
			const relativeDateMarkers = this.extractRelativeDates(text, chunk.id);
			markers.push(...relativeDateMarkers);
		}

		// Extract times
		if (this.options.enableTimes) {
			const timeMarkers = this.extractTimes(text, chunk.id);
			markers.push(...timeMarkers);
		}

		// Extract durations
		if (this.options.enableDurations) {
			const durationMarkers = this.extractDurations(text, chunk.id);
			markers.push(...durationMarkers);
		}

		// Extract frequencies
		if (this.options.enableFrequencies) {
			const frequencyMarkers = this.extractFrequencies(text, chunk.id);
			markers.push(...frequencyMarkers);
		}

		// Extract seasonal references
		if (this.options.enableSeasonal) {
			const seasonalMarkers = this.extractSeasonalReferences(text, chunk.id);
			markers.push(...seasonalMarkers);
		}

		// Extract era references
		if (this.options.enableEras) {
			const eraMarkers = this.extractEraReferences(text, chunk.id);
			markers.push(...eraMarkers);
		}

		return markers;
	}

	/**
	 * Extract absolute dates from text
	 */
	private extractAbsoluteDates(text: string, chunkId: string): TemporalMarker[] {
		const markers: TemporalMarker[] = [];

		// ISO date format (YYYY-MM-DD)
		const isoDateRegex = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g;
		let match;
		while ((match = isoDateRegex.exec(text)) !== null) {
			const [fullMatch, year, month, day] = match;
			const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
			
			if (!isNaN(date.getTime())) {
				markers.push({
					id: `temporal_${chunkId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					text: fullMatch,
					type: 'absolute_date',
					value: date,
					confidence: 0.95,
					metadata: {
						normalized: date.toISOString().split('T')[0],
						context: this.extractContext(text, match.index, fullMatch.length),
						provenance: {
							offset: match.index,
							length: fullMatch.length
						},
						year: parseInt(year),
						month: parseInt(month),
						day: parseInt(day)
					}
				});
			}
		}

		// Written date format (January 15, 2024)
		const writtenDateRegex = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/gi;
		while ((match = writtenDateRegex.exec(text)) !== null) {
			const [fullMatch, month, day, year] = match;
			const monthIndex = this.getMonthIndex(month);
			const date = new Date(parseInt(year), monthIndex, parseInt(day));
			
			if (!isNaN(date.getTime())) {
				markers.push({
					id: `temporal_${chunkId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					text: fullMatch,
					type: 'absolute_date',
					value: date,
					confidence: 0.9,
					metadata: {
						normalized: date.toISOString().split('T')[0],
						context: this.extractContext(text, match.index, fullMatch.length),
						provenance: {
							offset: match.index,
							length: fullMatch.length
						},
						monthName: month,
						monthIndex: monthIndex,
						day: parseInt(day),
						year: parseInt(year)
					}
				});
			}
		}

		// Short date format (MM/DD/YYYY or DD/MM/YYYY)
		const shortDateRegex = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;
		while ((match = shortDateRegex.exec(text)) !== null) {
			const [fullMatch, first, second, year] = match;
			// Assume US format (MM/DD/YYYY) for now
			const month = parseInt(first);
			const day = parseInt(second);
			const date = new Date(parseInt(year), month - 1, day);
			
			if (!isNaN(date.getTime())) {
				markers.push({
					id: `temporal_${chunkId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					text: fullMatch,
					type: 'absolute_date',
					value: date,
					confidence: 0.85,
					metadata: {
						normalized: date.toISOString().split('T')[0],
						context: this.extractContext(text, match.index, fullMatch.length),
						provenance: {
							offset: match.index,
							length: fullMatch.length
						},
						month: month,
						day: day,
						year: parseInt(year),
						format: 'MM/DD/YYYY'
					}
				});
			}
		}

		return markers;
	}

	/**
	 * Extract relative dates from text
	 */
	private extractRelativeDates(text: string, chunkId: string): TemporalMarker[] {
		const markers: TemporalMarker[] = [];
		const referenceDate = this.options.referenceDate || new Date();

		// Yesterday, today, tomorrow
		const dayReferences = [
			{ pattern: /\byesterday\b/gi, days: -1, confidence: 0.95 },
			{ pattern: /\btoday\b/gi, days: 0, confidence: 0.95 },
			{ pattern: /\btomorrow\b/gi, days: 1, confidence: 0.95 }
		];

		for (const { pattern, days, confidence } of dayReferences) {
			let match;
			while ((match = pattern.exec(text)) !== null) {
				const date = new Date(referenceDate);
				date.setDate(date.getDate() + days);

				markers.push({
					id: `temporal_${chunkId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					text: match[0],
					type: 'relative_date',
					value: {
						reference: days < 0 ? 'past' : days > 0 ? 'future' : 'now',
						amount: Math.abs(days),
						unit: 'day'
					},
					confidence,
					metadata: {
						normalized: date.toISOString().split('T')[0],
						context: this.extractContext(text, match.index, match[0].length),
						provenance: {
							offset: match.index,
							length: match[0].length
						},
						relativeDays: days,
						absoluteDate: date.toISOString().split('T')[0]
					}
				});
			}
		}

		// Next/last week/month/year
		const periodReferences = [
			{ pattern: /\bnext\s+(week|month|year)\b/gi, direction: 1, confidence: 0.9 },
			{ pattern: /\blast\s+(week|month|year)\b/gi, direction: -1, confidence: 0.9 }
		];

		for (const { pattern, direction, confidence } of periodReferences) {
			let match;
			while ((match = pattern.exec(text)) !== null) {
				const period = match[1].toLowerCase();
				const unit = period === 'week' ? 'week' : period === 'month' ? 'month' : 'year';
				
				markers.push({
					id: `temporal_${chunkId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					text: match[0],
					type: 'relative_date',
					value: {
						reference: direction > 0 ? 'future' : 'past',
						amount: 1,
						unit,
						modifier: direction > 0 ? 'from_now' : 'ago'
					},
					confidence,
					metadata: {
						normalized: `${direction > 0 ? 'next' : 'last'} ${period}`,
						context: this.extractContext(text, match.index, match[0].length),
						provenance: {
							offset: match.index,
							length: match[0].length
						},
						period,
						direction
					}
				});
			}
		}

		return markers;
	}

	/**
	 * Extract time references from text
	 */
	private extractTimes(text: string, chunkId: string): TemporalMarker[] {
		const markers: TemporalMarker[] = [];

		// 24-hour format (14:30, 14:30:45)
		const time24Regex = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/g;
		let match;
		while ((match = time24Regex.exec(text)) !== null) {
			const [fullMatch, hour, minute, second] = match;
			const hourNum = parseInt(hour);
			const minuteNum = parseInt(minute);
			
			if (hourNum >= 0 && hourNum <= 23 && minuteNum >= 0 && minuteNum <= 59) {
				const time = new Date();
				time.setHours(hourNum, minuteNum, second ? parseInt(second) : 0, 0);

				markers.push({
					id: `temporal_${chunkId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					text: fullMatch,
					type: 'absolute_time',
					value: time,
					confidence: 0.9,
					metadata: {
						normalized: time.toTimeString().split(' ')[0],
						context: this.extractContext(text, match.index, fullMatch.length),
						provenance: {
							offset: match.index,
							length: fullMatch.length
						},
						hour: hourNum,
						minute: minuteNum,
						second: second ? parseInt(second) : 0,
						format: '24h'
					}
				});
			}
		}

		// 12-hour format (2:30 PM, 2:30:45 PM)
		const time12Regex = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)\b/gi;
		while ((match = time12Regex.exec(text)) !== null) {
			const [fullMatch, hour, minute, second, period] = match;
			let hourNum = parseInt(hour);
			const minuteNum = parseInt(minute);
			
			// Convert to 24-hour format
			if (period.toUpperCase() === 'PM' && hourNum !== 12) {
				hourNum += 12;
			} else if (period.toUpperCase() === 'AM' && hourNum === 12) {
				hourNum = 0;
			}
			
			if (hourNum >= 0 && hourNum <= 23 && minuteNum >= 0 && minuteNum <= 59) {
				const time = new Date();
				time.setHours(hourNum, minuteNum, second ? parseInt(second) : 0, 0);

				markers.push({
					id: `temporal_${chunkId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					text: fullMatch,
					type: 'absolute_time',
					value: time,
					confidence: 0.9,
					metadata: {
						normalized: time.toTimeString().split(' ')[0],
						context: this.extractContext(text, match.index, fullMatch.length),
						provenance: {
							offset: match.index,
							length: fullMatch.length
						},
						hour: hourNum,
						minute: minuteNum,
						second: second ? parseInt(second) : 0,
						period: period.toUpperCase(),
						format: '12h'
					}
				});
			}
		}

		return markers;
	}

	/**
	 * Extract duration references from text
	 */
	private extractDurations(text: string, chunkId: string): TemporalMarker[] {
		const markers: TemporalMarker[] = [];

		// Duration patterns (3 days, 2 weeks, 1 month, etc.)
		const durationRegex = /\b(\d+)\s+(second|minute|hour|day|week|month|year)s?\b/gi;
		let match;
		while ((match = durationRegex.exec(text)) !== null) {
			const [fullMatch, amount, unit] = match;
			const amountNum = parseInt(amount);
			const unitSingular = unit.toLowerCase().replace(/s$/, '');

			markers.push({
				id: `temporal_${chunkId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				text: fullMatch,
				type: 'duration',
				value: {
					reference: 'now',
					amount: amountNum,
					unit: unitSingular as any
				},
				confidence: 0.9,
				metadata: {
					normalized: `${amountNum} ${unitSingular}${amountNum !== 1 ? 's' : ''}`,
					context: this.extractContext(text, match.index, fullMatch.length),
					provenance: {
						offset: match.index,
						length: fullMatch.length
					},
					amount: amountNum,
					unit: unitSingular
				}
			});
		}

		return markers;
	}

	/**
	 * Extract frequency references from text
	 */
	private extractFrequencies(text: string, chunkId: string): TemporalMarker[] {
		const markers: TemporalMarker[] = [];

		// Frequency patterns (daily, weekly, monthly, etc.)
		const frequencyPatterns = [
			{ pattern: /\b(daily|weekly|monthly|yearly|annually)\b/gi, unit: 'day' },
			{ pattern: /\b(every\s+day|every\s+week|every\s+month|every\s+year)\b/gi, unit: 'day' },
			{ pattern: /\b(twice\s+a\s+day|twice\s+a\s+week|twice\s+a\s+month)\b/gi, unit: 'day' }
		];

		for (const { pattern, unit } of frequencyPatterns) {
			let match;
			while ((match = pattern.exec(text)) !== null) {
				markers.push({
					id: `temporal_${chunkId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					text: match[0],
					type: 'frequency',
					value: {
						reference: 'now',
						amount: 1,
						unit: unit as any
					},
					confidence: 0.85,
					metadata: {
						normalized: match[0].toLowerCase(),
						context: this.extractContext(text, match.index, match[0].length),
						provenance: {
							offset: match.index,
							length: match[0].length
						},
						frequency: match[0].toLowerCase()
					}
				});
			}
		}

		return markers;
	}

	/**
	 * Extract seasonal references from text
	 */
	private extractSeasonalReferences(text: string, chunkId: string): TemporalMarker[] {
		const markers: TemporalMarker[] = [];

		// Seasons
		const seasonPattern = /\b(spring|summer|fall|autumn|winter)\b/gi;
		let match;
		while ((match = seasonPattern.exec(text)) !== null) {
			markers.push({
				id: `temporal_${chunkId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				text: match[0],
				type: 'seasonal',
				value: {
					reference: 'now',
					amount: 1,
					unit: 'season'
				},
				confidence: 0.9,
				metadata: {
					normalized: match[0].toLowerCase(),
					context: this.extractContext(text, match.index, match[0].length),
					provenance: {
						offset: match.index,
						length: match[0].length
					},
					season: match[0].toLowerCase()
				}
			});
		}

		// Quarters
		const quarterPattern = /\bQ[1-4]\b/gi;
		while ((match = quarterPattern.exec(text)) !== null) {
			markers.push({
				id: `temporal_${chunkId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				text: match[0],
				type: 'seasonal',
				value: {
					reference: 'now',
					amount: 1,
					unit: 'quarter'
				},
				confidence: 0.95,
				metadata: {
					normalized: match[0].toUpperCase(),
					context: this.extractContext(text, match.index, match[0].length),
					provenance: {
						offset: match.index,
						length: match[0].length
					},
					quarter: match[0].toUpperCase()
				}
			});
		}

		return markers;
	}

	/**
	 * Extract era references from text
	 */
	private extractEraReferences(text: string, chunkId: string): TemporalMarker[] {
		const markers: TemporalMarker[] = [];

		// Historical eras and periods
		const eraPatterns = [
			{ pattern: /\b(Victorian|Renaissance|Medieval|Ancient|Modern)\s+era\b/gi, confidence: 0.9 },
			{ pattern: /\b(WWI|WWII|World\s+War\s+I|World\s+War\s+II)\b/gi, confidence: 0.95 },
			{ pattern: /\b(Roman|Greek|Egyptian|Chinese|Japanese)\s+Empire\b/gi, confidence: 0.9 },
			{ pattern: /\b(Industrial|Digital|Information)\s+Revolution\b/gi, confidence: 0.9 }
		];

		for (const { pattern, confidence } of eraPatterns) {
			let match;
			while ((match = pattern.exec(text)) !== null) {
				markers.push({
					id: `temporal_${chunkId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					text: match[0],
					type: 'era',
					value: {
						reference: 'past',
						amount: 1,
						unit: 'era'
					},
					confidence,
					metadata: {
						normalized: match[0].toLowerCase(),
						context: this.extractContext(text, match.index, match[0].length),
						provenance: {
							offset: match.index,
							length: match[0].length
						},
						era: match[0].toLowerCase()
					}
				});
			}
		}

		return markers;
	}

	/**
	 * Normalize text by replacing temporal markers with standardized forms
	 */
	private normalizeTextWithMarkers(chunks: Chunk[], markers: TemporalMarker[]): string {
		let normalizedText = chunks.map(chunk => chunk.text).join('\n');

		// Sort markers by offset in reverse order to avoid index shifting
		const sortedMarkers = [...markers].sort((a, b) => 
			b.metadata.provenance.offset - a.metadata.provenance.offset
		);

		for (const marker of sortedMarkers) {
			const { offset, length } = marker.metadata.provenance;
			const normalized = marker.metadata.normalized;
			
			normalizedText = normalizedText.slice(0, offset) + 
				`[${normalized}]` + 
				normalizedText.slice(offset + length);
		}

		return normalizedText;
	}

	/**
	 * Calculate metadata about extracted markers
	 */
	private calculateMetadata(markers: TemporalMarker[]): TemporalProcessingResult['metadata'] {
		const byType: Record<TemporalType, number> = {
			absolute_date: 0,
			absolute_time: 0,
			relative_date: 0,
			relative_time: 0,
			duration: 0,
			frequency: 0,
			seasonal: 0,
			era: 0,
			uncertain: 0
		};

		let high = 0, medium = 0, low = 0;

		for (const marker of markers) {
			byType[marker.type]++;
			
			if (marker.confidence >= 0.8) high++;
			else if (marker.confidence >= 0.6) medium++;
			else low++;
		}

		return {
			totalMarkers: markers.length,
			byType,
			confidenceDistribution: { high, medium, low }
		};
	}

	/**
	 * Extract context around a temporal marker
	 */
	private extractContext(text: string, offset: number, length: number): string {
		const start = Math.max(0, offset - 50);
		const end = Math.min(text.length, offset + length + 50);
		return text.substring(start, end);
	}

	/**
	 * Get month index from month name
	 */
	private getMonthIndex(monthName: string): number {
		const months = [
			'january', 'february', 'march', 'april', 'may', 'june',
			'july', 'august', 'september', 'october', 'november', 'december'
		];
		return months.indexOf(monthName.toLowerCase());
	}

	/**
	 * Convert temporal markers to atoms for integration with the main system
	 */
	convertToAtoms(markers: TemporalMarker[], chunkId: string): Atom[] {
		return markers.map(marker => ({
			id: marker.id,
			chunkId,
			type: 'DATE',
			text: marker.text,
			confidence: marker.confidence,
			metadata: {
				...marker.metadata,
				temporalType: marker.type,
				temporalValue: marker.value
			},
			provenance: marker.metadata.provenance,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}));
	}
}
