# Supabase Storage 빠른 설정 가이드

## 1️⃣ Storage 버킷 생성 (필수!)

### Supabase Dashboard 접속:
```
https://supabase.com/dashboard/project/twradcbjuupitopmrtmz/storage/buckets
```

### 버킷 2개 생성:

#### 📦 버킷 1: `photos` (워터마크 버전)
1. "New bucket" 클릭
2. Name: `photos`
3. Public bucket: **✅ 체크** (누구나 볼 수 있음)
4. "Create bucket" 클릭

#### 📦 버킷 2: `photos-original` (원본)
1. "New bucket" 클릭
2. Name: `photos-original`
3. Public bucket: **❌ 체크 안 함** (구매자만)
4. "Create bucket" 클릭

---

## 2️⃣ 작동 방식 (백엔드 서버 불필요!)

```
사진 업로드 (브라우저에서 직접)
    ↓
Supabase Storage (AWS S3 같은 클라우드)
    ↓
Public URL 자동 생성
    ↓
https://twradcbjuupitopmrtmz.supabase.co/storage/v1/object/public/photos/...
```

---

## 3️⃣ 테스트

```bash
# 개발 서버 실행
npm run dev

# 브라우저에서
# 1. 회원가입
# 2. 사진작가 신청
# 3. 사진 업로드 → 자동으로 Supabase Storage에 저장됨
# 4. 코드 생성 → 링크로 바로 접근 가능!
```

---

## ✅ 완료 확인

Storage 탭에서:
- ✅ photos 버킷 (Public)
- ✅ photos-original 버킷 (Private)

두 개가 보이면 완료!

---

## 💡 추가 정보

- **용량**: 무료 플랜 1GB (충분함)
- **CDN**: 전 세계 빠른 로딩
- **보안**: RLS 정책으로 자동 관리
- **백업**: 자동 백업 지원

**FastAPI, Express 같은 서버 필요 없어요!**
