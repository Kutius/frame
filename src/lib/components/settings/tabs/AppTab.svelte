<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import Input from '$lib/components/ui/Input.svelte';
	import Label from '$lib/components/ui/Label.svelte';

	let {
		maxConcurrency,
		disabled = false,
		onUpdate
	}: {
		maxConcurrency: number;
		disabled?: boolean;
		onUpdate: (value: number) => void | Promise<void>;
	} = $props();

	let localValue = $derived.by(() => {
		let value = $state(String(maxConcurrency));
		return {
			get current() {
				return value;
			},
			set current(v) {
				value = v;
			}
		};
	});

	let isSaving = $state(false);

	async function handleSave() {
		const parsed = Number(localValue.current);
		isSaving = true;
		try {
			await onUpdate(parsed);
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="space-y-4">
	<div class="space-y-2">
		<Label for="max-concurrency" variant="section">Max Concurrency</Label>
		<div class="flex items-end gap-2">
			<div class="flex-1">
				<Input
					id="max-concurrency"
					type="text"
					inputmode="numeric"
					value={localValue.current}
					oninput={(e) => {
						const sanitized = e.currentTarget.value.replace(/[^0-9]/g, '');
						if (sanitized !== e.currentTarget.value) {
							e.currentTarget.value = sanitized;
						}
						localValue.current = sanitized;
					}}
					placeholder="2"
					disabled={disabled || isSaving}
				/>
			</div>
			<button
				onclick={handleSave}
				disabled={disabled || isSaving || localValue.current === String(maxConcurrency)}
				class={cn(
					'h-7.5 rounded border px-3 py-1.5 text-[10px] tracking-wide uppercase transition-all',
					disabled || isSaving || localValue.current === String(maxConcurrency)
						? 'border-gray-alpha-200 text-gray-alpha-600 cursor-not-allowed opacity-50'
						: 'border-ds-blue-600 text-ds-blue-600 hover:bg-ds-blue-900/20'
				)}
			>
				{isSaving ? 'Saving...' : 'Apply'}
			</button>
		</div>
	</div>
</div>
