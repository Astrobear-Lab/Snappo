#!/usr/bin/env python3
"""
이미지 메타데이터 추출 프로그램
EXIF, IPTC, XMP, PNG, ICC 프로파일 등 모든 메타데이터를 표시합니다.
"""

import argparse
import sys
import hashlib
import json
from pathlib import Path
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from datetime import datetime
from collections import Counter


def get_exif_data(image):
    """이미지에서 EXIF 데이터 추출"""
    exif_data = {}
    try:
        exif = image._getexif()
        if exif:
            for tag_id, value in exif.items():
                tag = TAGS.get(tag_id, tag_id)

                # GPS 데이터 처리
                if tag == "GPSInfo":
                    gps_data = {}
                    for gps_tag_id in value:
                        gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                        gps_data[gps_tag] = value[gps_tag_id]
                    exif_data[tag] = gps_data
                else:
                    exif_data[tag] = value
    except AttributeError:
        pass
    return exif_data


def get_iptc_data(image):
    """이미지에서 IPTC 데이터 추출"""
    iptc_data = {}

    # Pillow의 APP13 세그먼트에서 IPTC 데이터 추출
    if hasattr(image, 'app') and 'APP13' in image.app:
        try:
            from iptcinfo3 import IPTCInfo
            # 임시로 파일에서 읽기 시도
        except ImportError:
            pass

    # getiptcinfo 메서드 사용 (일부 이미지에서 지원)
    try:
        iptc = image.getiptcinfo() if hasattr(image, 'getiptcinfo') else None
        if iptc:
            iptc_data = iptc
    except:
        pass

    return iptc_data


def get_xmp_data(image):
    """이미지에서 XMP 데이터 추출"""
    xmp_data = None

    try:
        # PIL Image의 info 딕셔너리에서 XMP 찾기
        if 'XML:com.adobe.xmp' in image.info:
            xmp_data = image.info['XML:com.adobe.xmp']
        elif 'xmp' in image.info:
            xmp_data = image.info['xmp']
    except:
        pass

    return xmp_data


def get_png_metadata(image):
    """PNG 이미지의 메타데이터 추출"""
    png_data = {}

    if image.format == 'PNG':
        # PNG info 딕셔너리에서 텍스트 청크 추출
        for key, value in image.info.items():
            if isinstance(value, (str, bytes)):
                try:
                    if isinstance(value, bytes):
                        value = value.decode('utf-8', errors='ignore')
                    png_data[key] = value
                except:
                    pass

    return png_data


def get_jpeg_metadata(image):
    """JPEG 이미지의 메타데이터 추출"""
    jpeg_data = {}

    if image.format == 'JPEG':
        # JFIF 정보
        if 'jfif' in image.info:
            jpeg_data['JFIF 버전'] = image.info['jfif']

        if 'jfif_version' in image.info:
            version = image.info['jfif_version']
            jpeg_data['JFIF 버전'] = f"{version[0]}.{version[1]}"

        if 'jfif_unit' in image.info:
            units = {0: '없음', 1: 'DPI', 2: 'DPCM'}
            jpeg_data['JFIF 단위'] = units.get(image.info['jfif_unit'], image.info['jfif_unit'])

        if 'jfif_density' in image.info:
            density = image.info['jfif_density']
            jpeg_data['JFIF 해상도'] = f"{density[0]} x {density[1]}"

        # DPI 정보
        if 'dpi' in image.info:
            dpi = image.info['dpi']
            if isinstance(dpi, tuple):
                jpeg_data['DPI'] = f"{dpi[0]} x {dpi[1]}"
            else:
                jpeg_data['DPI'] = dpi

        # JPEG 코멘트
        if 'comment' in image.info:
            comment = image.info['comment']
            if isinstance(comment, bytes):
                comment = comment.decode('utf-8', errors='ignore')
            jpeg_data['코멘트'] = comment

        # 프로그레시브 여부
        if 'progression' in image.info:
            jpeg_data['프로그레시브'] = '예' if image.info['progression'] else '아니오'

        # 품질 추정 (압축 정보)
        if 'quality' in image.info:
            jpeg_data['품질'] = image.info['quality']

        # Exif가 없어도 있을 수 있는 기타 정보들
        for key in image.info:
            if key not in ['jfif', 'jfif_version', 'jfif_unit', 'jfif_density',
                          'dpi', 'comment', 'progression', 'quality',
                          'exif', 'icc_profile', 'adobe', 'adobe_transform']:
                value = image.info[key]
                if isinstance(value, bytes):
                    try:
                        value = value.decode('utf-8', errors='ignore')
                        if len(value) > 100:
                            value = value[:100] + "..."
                    except:
                        value = f"<binary data, {len(value)} bytes>"
                jpeg_data[key] = value

    return jpeg_data


def get_icc_profile(image):
    """ICC 색상 프로파일 정보 추출"""
    icc_info = {}

    try:
        if 'icc_profile' in image.info:
            icc_profile = image.info['icc_profile']
            icc_info['존재'] = True
            icc_info['크기'] = f"{len(icc_profile)} bytes"

            # ICC 프로파일 헤더 파싱 (간단한 정보만)
            if len(icc_profile) >= 128:
                # 프로파일 설명 추출 시도
                try:
                    # 색상 공간 (16-20 바이트)
                    color_space = icc_profile[16:20].decode('ascii', errors='ignore').strip()
                    if color_space:
                        icc_info['색상 공간'] = color_space
                except:
                    pass
    except:
        pass

    return icc_info


def get_gif_info(image):
    """GIF 애니메이션 정보 추출"""
    gif_info = {}

    if image.format == 'GIF':
        try:
            # 애니메이션 여부 확인
            is_animated = getattr(image, 'is_animated', False)
            gif_info['애니메이션'] = is_animated

            if is_animated:
                n_frames = getattr(image, 'n_frames', 1)
                gif_info['프레임 수'] = n_frames

                # 각 프레임의 지속 시간 추출
                durations = []
                for i in range(n_frames):
                    try:
                        image.seek(i)
                        duration = image.info.get('duration', 0)
                        durations.append(duration)
                    except:
                        break

                if durations:
                    total_duration = sum(durations)
                    gif_info['총 지속 시간'] = f"{total_duration}ms ({total_duration/1000:.2f}초)"
                    gif_info['평균 프레임 시간'] = f"{sum(durations)/len(durations):.0f}ms"

                # 루프 정보
                loop = image.info.get('loop', 0)
                gif_info['루프'] = '무한' if loop == 0 else loop

                # 첫 프레임으로 되돌리기
                image.seek(0)
        except:
            pass

    return gif_info


def calculate_image_hash(image_path):
    """이미지 파일의 해시값 계산"""
    hashes = {}

    try:
        with open(image_path, 'rb') as f:
            file_data = f.read()
            hashes['MD5'] = hashlib.md5(file_data).hexdigest()
            hashes['SHA256'] = hashlib.sha256(file_data).hexdigest()
    except:
        pass

    return hashes


def analyze_image_colors(image):
    """이미지 색상 분석"""
    color_info = {}

    try:
        # 투명도 여부
        color_info['투명도'] = '있음' if image.mode in ('RGBA', 'LA', 'P') else '없음'

        # 이미지를 작게 리사이즈하여 평균 색상 계산
        img_small = image.copy()
        img_small.thumbnail((100, 100))

        # RGB로 변환
        if img_small.mode != 'RGB':
            img_small = img_small.convert('RGB')

        # 픽셀 데이터 추출
        pixels = list(img_small.getdata())

        # 평균 색상 계산
        avg_r = sum(p[0] for p in pixels) // len(pixels)
        avg_g = sum(p[1] for p in pixels) // len(pixels)
        avg_b = sum(p[2] for p in pixels) // len(pixels)

        color_info['평균 색상 (RGB)'] = f"({avg_r}, {avg_g}, {avg_b})"
        color_info['평균 색상 (HEX)'] = f"#{avg_r:02x}{avg_g:02x}{avg_b:02x}"

        # 가장 많이 사용된 색상 (상위 5개)
        color_counter = Counter(pixels)
        most_common = color_counter.most_common(5)

        dominant_colors = []
        for color, count in most_common:
            percentage = (count / len(pixels)) * 100
            hex_color = f"#{color[0]:02x}{color[1]:02x}{color[2]:02x}"
            dominant_colors.append(f"{hex_color} ({percentage:.1f}%)")

        if dominant_colors:
            color_info['주요 색상'] = dominant_colors

    except Exception as e:
        pass

    return color_info


def format_gps_coordinates(gps_info):
    """GPS 좌표를 읽기 쉬운 형식으로 변환"""
    if not gps_info:
        return None

    def convert_to_degrees(value):
        """GPS 좌표를 도(degree) 형식으로 변환"""
        d, m, s = value
        return float(d) + float(m) / 60 + float(s) / 3600

    try:
        lat = gps_info.get('GPSLatitude')
        lat_ref = gps_info.get('GPSLatitudeRef')
        lon = gps_info.get('GPSLongitude')
        lon_ref = gps_info.get('GPSLongitudeRef')

        if lat and lon:
            lat_degrees = convert_to_degrees(lat)
            lon_degrees = convert_to_degrees(lon)

            if lat_ref == 'S':
                lat_degrees = -lat_degrees
            if lon_ref == 'W':
                lon_degrees = -lon_degrees

            return f"{lat_degrees:.6f}, {lon_degrees:.6f}"
    except (KeyError, TypeError, ValueError):
        pass

    return None


def print_metadata(image_path, verbose=False):
    """이미지 메타데이터 출력"""
    try:
        # 파일 존재 확인
        if not Path(image_path).exists():
            print(f"❌ 오류: 파일을 찾을 수 없습니다: {image_path}")
            return False

        # 이미지 열기
        with Image.open(image_path) as img:
            print("=" * 70)
            print(f"📸 이미지 메타데이터: {Path(image_path).name}")
            print("=" * 70)

            # 기본 정보
            print("\n📋 기본 정보:")
            print(f"  • 파일 경로: {image_path}")
            print(f"  • 이미지 크기: {img.size[0]} x {img.size[1]} 픽셀")
            print(f"  • 포맷: {img.format}")
            print(f"  • 색상 모드: {img.mode}")

            # 파일 크기 및 시간 정보
            file_stat = Path(image_path).stat()
            file_size = file_stat.st_size
            if file_size > 1024 * 1024:
                print(f"  • 파일 크기: {file_size / (1024 * 1024):.2f} MB")
            else:
                print(f"  • 파일 크기: {file_size / 1024:.2f} KB")

            # 파일 시간 정보
            print("\n⏰ 파일 시간 정보:")

            # 생성 시간 (macOS/Windows에서만 지원)
            if hasattr(file_stat, 'st_birthtime'):
                created_time = datetime.fromtimestamp(file_stat.st_birthtime)
                print(f"  • 생성 시간: {created_time.strftime('%Y-%m-%d %H:%M:%S')}")

            # 수정 시간
            modified_time = datetime.fromtimestamp(file_stat.st_mtime)
            print(f"  • 수정 시간: {modified_time.strftime('%Y-%m-%d %H:%M:%S')}")

            # 접근 시간 (verbose 모드에서만)
            if verbose:
                accessed_time = datetime.fromtimestamp(file_stat.st_atime)
                print(f"  • 접근 시간: {accessed_time.strftime('%Y-%m-%d %H:%M:%S')}")

            # 파일 해시
            if verbose:
                hashes = calculate_image_hash(image_path)
                if hashes:
                    print("\n🔐 파일 해시:")
                    for hash_type, hash_value in hashes.items():
                        print(f"  • {hash_type}: {hash_value}")

            # EXIF 데이터
            exif_data = get_exif_data(img)

            if exif_data:
                print("\n📷 EXIF 데이터:")

                # 중요 EXIF 필드만 표시
                important_fields = {
                    'DateTime': '촬영 시간',
                    'DateTimeOriginal': '원본 촬영 시간',
                    'Make': '카메라 제조사',
                    'Model': '카메라 모델',
                    'LensModel': '렌즈 모델',
                    'ExposureTime': '노출 시간',
                    'FNumber': 'F값',
                    'ISO': 'ISO',
                    'ISOSpeedRatings': 'ISO',
                    'FocalLength': '초점 거리',
                    'Flash': '플래시',
                    'WhiteBalance': '화이트 밸런스',
                    'Software': '소프트웨어',
                    'Artist': '작가',
                    'Copyright': '저작권',
                    'ImageDescription': '이미지 설명',
                }

                found_important = False
                for tag, label in important_fields.items():
                    if tag in exif_data:
                        value = exif_data[tag]

                        # 특수 처리
                        if tag == 'ExposureTime' and isinstance(value, tuple):
                            value = f"{value[0]}/{value[1]} 초"
                        elif tag == 'FNumber' and isinstance(value, tuple):
                            value = f"f/{value[0]/value[1]:.1f}"
                        elif tag == 'FocalLength' and isinstance(value, tuple):
                            value = f"{value[0]/value[1]:.1f} mm"

                        print(f"  • {label}: {value}")
                        found_important = True

                # GPS 정보
                if 'GPSInfo' in exif_data:
                    coords = format_gps_coordinates(exif_data['GPSInfo'])
                    if coords:
                        print(f"\n📍 GPS 위치:")
                        print(f"  • 좌표: {coords}")
                        print(f"  • Google Maps: https://www.google.com/maps?q={coords}")

                # 모든 EXIF 데이터 표시 옵션
                if verbose and len(exif_data) > 0:
                    print("\n  [전체 EXIF 태그]")
                    for tag, value in exif_data.items():
                        if tag not in important_fields and tag != 'GPSInfo':
                            print(f"  • {tag}: {value}")
                elif not found_important and len(exif_data) > 0:
                    print("  ℹ️  주요 EXIF 데이터가 없습니다.")
            else:
                print("\n📷 EXIF 데이터: 없음")

            # PNG 메타데이터
            png_data = get_png_metadata(img)
            if png_data:
                print("\n🖼️  PNG 메타데이터:")
                for key, value in png_data.items():
                    if key not in ['icc_profile', 'exif', 'xmp']:
                        # 긴 값은 잘라서 표시
                        if isinstance(value, str) and len(value) > 100:
                            value = value[:100] + "..."
                        print(f"  • {key}: {value}")

            # JPEG 메타데이터
            jpeg_data = get_jpeg_metadata(img)
            if jpeg_data:
                print("\n📄 JPEG 메타데이터:")
                for key, value in jpeg_data.items():
                    print(f"  • {key}: {value}")

            # XMP 데이터
            xmp_data = get_xmp_data(img)
            if xmp_data:
                print("\n📝 XMP 메타데이터:")
                if isinstance(xmp_data, bytes):
                    xmp_str = xmp_data.decode('utf-8', errors='ignore')
                else:
                    xmp_str = xmp_data

                # XMP 데이터가 너무 길면 요약만 표시
                if len(xmp_str) > 500 and not verbose:
                    print(f"  • 크기: {len(xmp_str)} bytes")
                    print("  • 전체 내용 보기: -v 옵션 사용")
                else:
                    # 간단한 XMP 파싱 (제목, 설명, 키워드 등)
                    if '<dc:title>' in xmp_str:
                        print("  • 제목 정보 포함")
                    if '<dc:description>' in xmp_str:
                        print("  • 설명 정보 포함")
                    if '<dc:subject>' in xmp_str:
                        print("  • 키워드 정보 포함")
                    if verbose:
                        print(f"\n{xmp_str}")

            # ICC 프로파일
            icc_info = get_icc_profile(img)
            if icc_info:
                print("\n🎨 ICC 색상 프로파일:")
                for key, value in icc_info.items():
                    print(f"  • {key}: {value}")

            # GIF 정보
            gif_info = get_gif_info(img)
            if gif_info:
                print("\n🎬 GIF 애니메이션 정보:")
                for key, value in gif_info.items():
                    print(f"  • {key}: {value}")

            # 색상 분석
            color_info = analyze_image_colors(img)
            if color_info:
                print("\n🎨 색상 분석:")
                for key, value in color_info.items():
                    if key == '주요 색상':
                        print(f"  • {key}:")
                        for i, color in enumerate(value, 1):
                            print(f"    {i}. {color}")
                    else:
                        print(f"  • {key}: {value}")

            print("\n" + "=" * 70)
            return True

    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        import traceback
        if verbose:
            traceback.print_exc()
        return False


def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(
        description='이미지 파일의 모든 메타데이터를 추출하고 표시합니다.',
        epilog='예시: python image_metadata_reader.py photo.jpg'
    )
    parser.add_argument(
        'image_path',
        help='메타데이터를 읽을 이미지 파일 경로'
    )
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='모든 메타데이터 및 상세 정보 표시'
    )

    args = parser.parse_args()

    # Pillow 설치 확인
    try:
        import PIL
    except ImportError:
        print("❌ Pillow 라이브러리가 설치되지 않았습니다.")
        print("다음 명령으로 설치하세요: pip install Pillow")
        sys.exit(1)

    # 메타데이터 출력
    success = print_metadata(args.image_path, verbose=args.verbose)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
