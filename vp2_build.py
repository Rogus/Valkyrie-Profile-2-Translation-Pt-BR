#!/usr/bin/env python3
"""Build a VP2 translation ISO from the tracked manifest."""

import argparse
import contextlib
import io
import os
import sys
import time
from pathlib import Path

from .paths import BUILD_DIR, CACHE_ROOT, DATA_DIR, PROJECT_ROOT
from . import build_manifest
from . import build_cache as _build_cache
from . import vp2_build_parallel as build_parallel
from . import vp2_iso_buffer as iso_buffer
from . import vp2_iso_space as iso_space
from . import vp2_shared_font as shared_font
from .build_cache import (
    CANONICAL_MANIFEST, TRACKED_CACHE_TRACE_ROOT,
)
from .build_config import (
    FLAG_MAP, expand_flags, lint_manifest, load_manifest, report_lint,
    warn_unknown_flags,
)
from .build_patchers import (
    _scene_args_from_row, audit_args, collect_shared_font_characters,
    install_shared_font_in_memory, install_shared_font_once, patch_args,
    patch_container_resource_in_memory, patch_fontless_resource_in_memory,
    patch_scene_resource_in_memory,
    patch_worldmap_resource_in_memory, preflight, run, verify_args,
    verify_scene_in_memory, wants_verify,
)
from .build_translations import (
    CHAPTERS_CSV, MAX_CONFLICTS_SHOWN, SCENES_DIR, WORKSPACE_DIR,
    _build_dedupe_lookup, _load_dedupe_lookup,
    _load_workspace_translations, _read_sheet_with_dedupe,
    apply_chapter_titles, repair_manifest_sheets, sheet_kind, workspace_kind,
)

def _sync_cache_config():
    """Keep compatibility constants effective after the cache extraction."""
    _build_cache.CANONICAL_MANIFEST = CANONICAL_MANIFEST
    _build_cache.TRACKED_CACHE_TRACE_ROOT = TRACKED_CACHE_TRACE_ROOT

def _is_full_canonical_build(args):
    _sync_cache_config()
    return _build_cache._is_full_canonical_build(args)

def _begin_tracked_cache_refresh(args):
    _sync_cache_config()
    return _build_cache._begin_tracked_cache_refresh(args)

def _cancel_tracked_cache_refresh(refresh):
    return _build_cache._cancel_tracked_cache_refresh(refresh)

def _finish_tracked_cache_refresh(refresh):
    return _build_cache._finish_tracked_cache_refresh(refresh)

def _copy_source_image(source_iso, partial):
    last = -1

    def report(percent):
        nonlocal last
        step = percent - percent % 10
        if step > last:
            last = step
            print(f"copy: {step}%", flush=True)

    iso_buffer.copy_image(str(source_iso), str(partial), progress=report)

def main():
    parser = argparse.ArgumentParser(
        description='Drive a VP2 translation build from a manifest.')
    args = parser.parse_args()

    rows = load_manifest(args.manifest)
    if args.derive_from_classify:
        before = len(rows)
        rows = build_manifest.derive_rows(
            args.scenes_dir, args.derive_from_classify, args.manifest)
        added = len(rows) - before
        print(f"derived {added} manifest row(s) from {args.derive_from_classify} "
              f"(scenes-dir: {args.scenes_dir})")
    if not rows:
        print("manifest is empty", file=sys.stderr)
        sys.exit(1)
    if args.skip_resources:
        skip = {r.strip() for r in args.skip_resources.split(',') if r.strip()}
        skipped = [r for r in rows if r.get('resource') in skip]
        rows = [r for r in rows if r.get('resource') not in skip]
        if skipped:
            print(f"skipping: {', '.join(r['resource'] for r in skipped)}")
        if not rows:
            print("no rows left after skip", file=sys.stderr)
            sys.exit(1)

    if args.lint:
        issues = lint_manifest(rows)
        errors, warns = report_lint(issues)
        sys.exit(1 if errors else 0)

    output_iso = Path(args.output_iso).resolve()
    working_iso = Path(args.working_iso).resolve()

    if output_iso.exists():
        print(f"replacing existing output: {output_iso}")
    if output_iso == working_iso:
        print(f"working ISO must differ from output ISO: {working_iso}",
              file=sys.stderr)
        sys.exit(1)
    if args.keep_working_iso and working_iso.exists():
        print(f"refusing to overwrite existing working ISO: {working_iso}",
              file=sys.stderr)
        sys.exit(1)

    source_iso = Path(args.source_iso).resolve()
    reference_iso = Path(args.reference_iso or args.source_iso).resolve()

    if not args.no_preflight:
        preflight(reference_iso, rows, dry_run=args.dry_run,
                  verbose=args.verbose)

    started = time.time()
    working_iso.parent.mkdir(parents=True, exist_ok=True)

    if args.dry_run:
        install_shared_font_once(
            str(working_iso), rows, dry_run=True)
        for row in rows:
            warn_unknown_flags(row, row['kind'])
            if row['kind'] == 'container':
                print(f"$ [in-memory] patch container resource "
                      f"{row['resource']} from {row['sheet']}")
                continue
            if row['kind'] in ('fontless', 'worldmap'):
                print(f"$ [in-memory] patch fontless resource "
                      f"{row['resource']} from {row['sheet']}")
                continue
            if row['kind'] == 'scene':
                print(f"$ [in-memory] patch scene resource {row['resource']} "
                      f"from {row['sheet']}")
                continue
            patch = patch_args(str(working_iso), row)
            run(patch, dry_run=True)
            vargs = verify_args(str(working_iso), row, str(reference_iso))
            if vargs:
                run(vargs, dry_run=True)
        print(f"dry run: would write {output_iso}")
        return

    if working_iso.exists():
        print(f"refusing to overwrite existing working ISO: {working_iso}",
              file=sys.stderr)
        sys.exit(1)
    working_iso.parent.mkdir(parents=True, exist_ok=True)

    cache_refresh = _begin_tracked_cache_refresh(args)

    use_parallel = (
        args.parallel
        and len(rows) > 1
        and all(r['kind'] in ('container', 'fontless', 'worldmap', 'scene')
                for r in rows)
    )

    if use_parallel:
        fits = build_parallel.jobs_that_fit(source_iso.stat().st_size)
        jobs = max(1, min(args.jobs, build_parallel.DEFAULT_JOBS_CAP, fits))
        if jobs < min(args.jobs, build_parallel.DEFAULT_JOBS_CAP):
            print(f"parallel: {jobs} worker(s); free memory holds that many "
                  f"copies of a {source_iso.stat().st_size / 2**30:.1f} GB image")
        primary_lookup = _load_dedupe_lookup(args.scenes_dir)
        try:
            build_parallel.run_parallel(
                str(source_iso), str(output_iso), rows,
                jobs=jobs,
                cache_root=Path(args.preinstall_cache),
                force_preinstall=args.no_preinstall_cache,
                verbose=args.verbose,
                primary_lookup=primary_lookup,
            )
        except Exception as exc:
            _cancel_tracked_cache_refresh(cache_refresh)
            print(f"parallel build failed: {exc}", file=sys.stderr)
            sys.exit(1)
        try:
            _finish_tracked_cache_refresh(cache_refresh)
        except Exception as exc:
            print(f"tracked SLZ cache refresh failed: {exc}", file=sys.stderr)
            sys.exit(1)
        if args.keep_working_iso:
            iso = iso_buffer.IsoBuffer.from_path(str(output_iso))
            iso.commit(str(working_iso))
            print(f"working ISO retained: {working_iso}")
        total = time.time() - started
        print(f"done. {len(rows)} resources in {total:.1f}s -> {output_iso}")
        if args.keep_working_iso:
            print(f"working ISO retained: {working_iso}")
        return

    output_iso.parent.mkdir(parents=True, exist_ok=True)
    partial = output_iso.with_name(output_iso.name + ".partial")
    if partial.exists():
        partial.unlink()
    print(f"copying source to {partial.name}")
    _copy_source_image(source_iso, partial)
    iso = iso_buffer.IsoFile(str(partial))

    if not args.no_repair_sheets:
        repair_manifest_sheets(rows)

    applied = apply_chapter_titles(rows)
    if applied:
        print(f"chapters: {applied} title(s) from "
              f"{os.path.relpath(CHAPTERS_CSV, PROJECT_ROOT)}")

    primary_lookup = _load_dedupe_lookup(args.scenes_dir)

    install_shared_font_in_memory(iso, rows, primary_lookup=primary_lookup)
    if not iso.table:
        raise RuntimeError("IsoFile missing tri-Ace index")

    reference_reader = iso_buffer.IsoFile(str(reference_iso), mode="rb")

    vacated = []

    def _fail(message, code=1):
        iso.close()
        _cancel_tracked_cache_refresh(cache_refresh)
        print(message, file=sys.stderr)
        print(f"partial ISO retained: {partial}", file=sys.stderr)
        sys.exit(code)

    for i, row in enumerate(rows):
        kind = row['kind']
        resource = row['resource']
        row_start = time.time()
        step = f"[{i + 1}/{len(rows)}] {kind} {resource}"

        warn_unknown_flags(row, kind)

        if kind in ('container', 'fontless', 'worldmap', 'scene'):
            row_log = io.StringIO()
            try:
                with contextlib.redirect_stdout(row_log):
                    if kind == 'container':
                        details = patch_container_resource_in_memory(
                            iso, row, primary_lookup=primary_lookup)
                    elif kind in ('fontless', 'worldmap'):
                        details = patch_fontless_resource_in_memory(
                            iso, row, primary_lookup=primary_lookup)
                    else:
                        details = patch_scene_resource_in_memory(
                            iso, row, primary_lookup=primary_lookup,
                            reference=reference_reader)
                written = details.get('written', 0)
            except Exception as exc:
                if row_log.getvalue():
                    print(row_log.getvalue(), end='', file=sys.stderr)
                _fail(f"{step} patch failed: {exc}")
            if args.verbose and row_log.getvalue():
                print(row_log.getvalue(), end='')
            if (details.get('grown_sectors')
                    or details.get('relocated_offset') is not None):
                iso.commit()
                iso.close()
                summary = iso_space.relocate(
                    str(partial), int(resource), details['patched'],
                    vacated=vacated)
                where = ("reusing space a previous move freed"
                         if summary['reused_vacated'] else "appended")
                print(f"  relocated resource #{resource}: "
                      f"{summary['old_sectors']} -> "
                      f"{summary['new_sectors']} sector(s), now at lba "
                      f"{summary['new_lba']} ({where})")
                iso = iso_buffer.IsoFile(str(partial))
            if (kind == 'scene' and wants_verify(row)
                    and not args.no_verify):
                iso.commit()
                iso.close()
                verify_log = io.StringIO()
                try:
                    with contextlib.redirect_stdout(verify_log):
                        verify_scene_in_memory(
                            partial, row, reference_iso,
                            primary_lookup=primary_lookup)
                except Exception as exc:
                    if verify_log.getvalue():
                        print(verify_log.getvalue(), end='', file=sys.stderr)
                    iso = iso_buffer.IsoFile(str(partial))
                    _fail(f"{step} verify failed: {exc}")
                if args.verbose and verify_log.getvalue():
                    print(verify_log.getvalue(), end='')
                iso = iso_buffer.IsoFile(str(partial))
        else:
            iso.commit()
            iso.close()
            pargs = patch_args(str(partial), row)
            result = run(pargs, dry_run=False)
            if result.returncode != 0:
                iso = iso_buffer.IsoFile(str(partial))
                _fail(f"{step} patch failed (exit {result.returncode})",
                      result.returncode)
            vargs = verify_args(str(partial), row, str(reference_iso))
            if vargs:
                result = run(vargs, dry_run=False)
                if result.returncode != 0:
                    iso = iso_buffer.IsoFile(str(partial))
                    _fail(f"{step} verify failed (exit {result.returncode})",
                          result.returncode)
            iso = iso_buffer.IsoFile(str(partial))
            written = None

        elapsed = time.time() - row_start
        suffix = (f" {written} records" if written is not None else "")
        print(f"{step} ok ({elapsed:.1f}s){suffix}")

    iso.commit()
    iso.close()
    os.replace(str(partial), str(output_iso))
    print(f"wrote output: {output_iso}")

    try:
        _finish_tracked_cache_refresh(cache_refresh)
    except Exception as exc:
        print(f"tracked SLZ cache refresh failed: {exc}", file=sys.stderr)
        sys.exit(1)

    total = time.time() - started
    print(f"done. {len(rows)} resources in {total:.1f}s -> {output_iso}")

if __name__ == '__main__':
    main()
