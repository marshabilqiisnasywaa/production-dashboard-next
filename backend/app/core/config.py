from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    secret_key: str
    access_token_minutes: int = 720
    cors_origins: str = "http://localhost:3000"
    cors_origin_regex: str = (
        r"^https?://(localhost|127\.0\.0\.1|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}"
        r"|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2})(:\d+)?$"
    )
    seed_admin_username: str | None = None
    seed_admin_password: str | None = None
    teamtalk_enabled: bool = False
    teamtalk_webhook_url: str | None = None

    # treshold setting similarity
    # skor minimum supaya dianggap dikenali
    face_match_threshold: float = 0.45
    # selisih minimum antara kandidat terbaik dan kandidat terbaik dari orang lain
    face_match_margin: float = 0.05
    #  skor minimum supaya scan boleh menambah template baru dari kamera
    face_update_threshold: float = 0.65

    # limitasi untuk mengaktifkan liveness detection, jika false maka semua scan akan diterima
    face_liveness_enabled: bool = True
    face_challenge_seconds: int = 30
    face_min_yaw_delta: float = 15.0
    face_left_yaw_sign: int = 1
    face_crowd_ratio: float = 0.6
    face_liveness_same_person: float = 0.3
    face_liveness_mode: str = "motion"
    face_min_motion: float = 8.0
    face_antispoof_enabled: bool = True
    face_antispoof_min_real: float = 0.5




    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
