import { AUDIO_ONLY_CONTAINERS, type ConversionConfig, type SourceMetadata } from '$lib/types';
import { getDefaultAudioCodec, isAudioCodecAllowed } from '$lib/services/media';

const PRESETS = [
	'ultrafast',
	'superfast',
	'veryfast',
	'faster',
	'fast',
	'medium',
	'slow',
	'slower',
	'veryslow'
] as const;

const NVENC_ALLOWED_PRESETS = new Set(['fast', 'medium', 'slow']);
const NVENC_ENCODERS = new Set(['h264_nvenc', 'hevc_nvenc', 'av1_nvenc']);
const VIDEOTOOLBOX_ENCODERS = new Set(['h264_videotoolbox', 'hevc_videotoolbox']);

const CONTAINER_CODEC_COMPATIBILITY: Record<string, Set<string>> = {
	mp4: new Set([
		'libx264',
		'libx265',
		'vp9',
		'libsvtav1',
		'h264_videotoolbox',
		'h264_nvenc',
		'hevc_videotoolbox',
		'hevc_nvenc',
		'av1_nvenc'
	]),
	mkv: new Set([
		'libx264',
		'libx265',
		'vp9',
		'prores',
		'libsvtav1',
		'h264_videotoolbox',
		'h264_nvenc',
		'hevc_videotoolbox',
		'hevc_nvenc',
		'av1_nvenc'
	]),
	webm: new Set(['vp9']),
	mov: new Set([
		'libx264',
		'libx265',
		'prores',
		'h264_videotoolbox',
		'h264_nvenc',
		'hevc_videotoolbox',
		'hevc_nvenc'
	])
};

const FALLBACK_VIDEO_CODECS = ['libx264', 'libx265', 'vp9', 'prores', 'libsvtav1'];

function isPresetAllowed(codec: string, preset: string): boolean {
	if (VIDEOTOOLBOX_ENCODERS.has(codec)) return false;
	if (NVENC_ENCODERS.has(codec)) return NVENC_ALLOWED_PRESETS.has(preset);
	return PRESETS.includes(preset as (typeof PRESETS)[number]);
}

function firstAllowedPreset(codec: string): string {
	return PRESETS.find((preset) => isPresetAllowed(codec, preset)) ?? 'medium';
}

function isCodecAllowed(container: string, codec: string): boolean {
	const allowed = CONTAINER_CODEC_COMPATIBILITY[container];
	if (!allowed) return true;
	return allowed.has(codec);
}

function firstAllowedCodec(container: string): string {
	const allowed = CONTAINER_CODEC_COMPATIBILITY[container];
	if (!allowed || allowed.size === 0) return FALLBACK_VIDEO_CODECS[0];

	for (const codec of FALLBACK_VIDEO_CODECS) {
		if (allowed.has(codec)) return codec;
	}

	return allowed.values().next().value ?? FALLBACK_VIDEO_CODECS[0];
}

export function normalizeConversionConfig(
	config: ConversionConfig,
	metadata?: SourceMetadata
): ConversionConfig {
	const next: ConversionConfig = {
		...config,
		selectedAudioTracks: [...(config.selectedAudioTracks ?? [])],
		selectedSubtitleTracks: [...(config.selectedSubtitleTracks ?? [])],
		metadata: { ...config.metadata },
		crop: config.crop ? { ...config.crop } : config.crop
	};

	const isSourceAudioOnly = Boolean(metadata && !metadata.videoCodec);
	if (isSourceAudioOnly && !AUDIO_ONLY_CONTAINERS.includes(next.container)) {
		next.container = 'mp3';
	}

	if (!isAudioCodecAllowed(next.audioCodec, next.container)) {
		next.audioCodec = getDefaultAudioCodec(next.container);
	}

	const isAudioContainer = AUDIO_ONLY_CONTAINERS.includes(next.container);
	if (isAudioContainer) {
		next.mlUpscale = 'none';
		next.selectedSubtitleTracks = [];
		next.subtitleBurnPath = undefined;
	}

	if (!isAudioContainer && !isCodecAllowed(next.container, next.videoCodec)) {
		next.videoCodec = firstAllowedCodec(next.container);
	}

	if (next.mlUpscale && next.mlUpscale !== 'none' && next.resolution !== 'original') {
		next.resolution = 'original';
	}

	if (!isPresetAllowed(next.videoCodec, next.preset)) {
		next.preset = firstAllowedPreset(next.videoCodec);
	}

	if (!NVENC_ENCODERS.has(next.videoCodec)) {
		next.nvencSpatialAq = false;
		next.nvencTemporalAq = false;
	}

	if (!VIDEOTOOLBOX_ENCODERS.has(next.videoCodec)) {
		next.videotoolboxAllowSw = false;
	}

	if (!NVENC_ENCODERS.has(next.videoCodec) && !VIDEOTOOLBOX_ENCODERS.has(next.videoCodec)) {
		next.hwDecode = false;
	}

	return next;
}
