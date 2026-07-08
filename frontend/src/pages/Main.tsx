import { useEffect, useState } from "react";
import bgImage from "../assets/bg.jpg";
import whatsappIcon from "../assets/whatsapp.svg";
import stuffIcon from "../assets/stuff.png";
import clothManIcon from "../assets/cloth_man.png";
import clothWomanIcon from "../assets/cloth_woman.png";
import streetIcon from "../assets/street.jpg";

const API_BASE = "https://api.axerium.org";

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
});

export default function Main() {
    const colors = [
        "#dce3d6",
        "#ebc7cc",
        "#526f5b",
        "#b7c4d1",
        "#e09b73",
        "#d1c4e0",
        "#1b2b45",
    ];

    const [weddingDate, setWeddingDate] = useState<Date | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchWeddingEvent = async () => {
            try {
                const res = await fetch(`${API_BASE}/events`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.wedding) {
                        setWeddingDate(new Date(data.wedding));
                    }
                }
            } catch (e) {
                console.error("Failed to load wedding date configuration", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWeddingEvent();
    }, []);

    useEffect(() => {
        if (!weddingDate) return;

        const interval = setInterval(() => {
            const now = new Date();
            setTimeLeft(Math.max(weddingDate.getTime() - now.getTime(), 0));
        }, 1);

        return () => {
            clearInterval(interval);
        };
    }, [weddingDate]);

    return (
        <div className="w-svw flex justify-center">
            <div className="max-w-88 w-10/12">
                <div
                    className="h-40 flex flex-col justify-center items-center"
                    translate="no"
                >
                    <div className="relative min-w-72 w-max text-nowrap select-none">
                        <h3 className="font-bickham text-primary text-8xl">
                            Wedding
                        </h3>
                        <div className="absolute top-17 left-10 flex flex-row gap-12 font-light text-primary">
                            <h3>Приглашение</h3>
                            <h3>на свадьбу</h3>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center bg-page shadow-[0_0_15px_2px] shadow-primary/20 text-primary min-h-50 justify-center">
                    {isLoading ? (
                        <div className="py-20 text-sm animate-pulse opacity-50 italic">
                            Загрузка...
                        </div>
                    ) : !weddingDate ? (
                        <div className="py-20 flex flex-col items-center justify-center">
                            <p className="font-marggraff text-2xl opacity-80">
                                Events are not configured
                            </p>
                            <p className="text-xs font-light mt-1 opacity-50">
                                Пожалуйста, настройте дату в панели
                                администратора.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-[#F2F2F2] w-full">
                                <div className="relative mx-auto w-full h-90 max-w-72 overflow-hidden">
                                    <img
                                        className="absolute -bottom-8 min-w-72 w-full max-w-72"
                                        src={bgImage}
                                        alt="bg"
                                    />
                                    <h3 className="absolute left-0 right-0 top-3 font-marggraff text-3xl text-center">
                                        {`${dateFormatter.format(weddingDate).replaceAll(".", " | ")}`}
                                    </h3>
                                    <h3 className="absolute left-0 right-0 top-13 font-marggraff text-sm font-light text-center">
                                        Адиль & Дарья
                                    </h3>
                                </div>
                            </div>

                            <div className="mt-4 w-full flex flex-col items-center gap-4">
                                <h3 className="font-marggraff text-center text-3xl">
                                    Дорогие гости!
                                </h3>
                                <p className="w-4/5 text-center font-light text-sm">
                                    Мы будем счастливы разделить с вами день,
                                    наполненный любовью, теплом и радостными
                                    моментами. С нетерпением ждём вас, чтобы
                                    вместе создать воспоминания, которые
                                    останутся с нами навсегда
                                </p>
                            </div>

                            <div className="mt-4 flex flex-row w-4/5 font-marggraff text-3xl text-center justify-between">
                                <div>
                                    <p>
                                        {Math.floor(
                                            timeLeft / (1000 * 60 * 60 * 24),
                                        )}
                                    </p>
                                    <p className="text-lg">Дней</p>
                                </div>
                                <div>
                                    <p>
                                        {Math.floor(
                                            timeLeft / (1000 * 60 * 60),
                                        ) % 24}
                                    </p>
                                    <p className="text-lg">Часов</p>
                                </div>
                                <div>
                                    <p>
                                        {Math.floor(timeLeft / (1000 * 60)) %
                                            60}
                                    </p>
                                    <p className="text-lg">Минут</p>
                                </div>
                                <div>
                                    <p>{Math.floor(timeLeft / 1000) % 60}</p>
                                    <p className="text-lg">Секунд</p>
                                </div>
                            </div>

                            <div className="mt-8 flex flex-col items-center w-full">
                                <h3 className="mb-2 text-3xl font-marggraff text-primary">
                                    Программа дня
                                </h3>
                                <img
                                    className="-mb-1 w-24 z-10"
                                    src={stuffIcon}
                                    alt=""
                                />
                                <div className="py-2 w-3/4 bg-[#979870] text-page text-center">
                                    <div>
                                        <p className="font-marggraff text-xl">
                                            11:30
                                        </p>
                                        <p>Сбор гостей</p>
                                    </div>
                                    <div className="mt-2">
                                        <p className="font-marggraff text-xl">
                                            11:45
                                        </p>
                                        <p>Роспись</p>
                                    </div>
                                    <div className="mt-2">
                                        <p className="font-marggraff text-xl">
                                            18:30
                                        </p>
                                        <p>Начало празднования</p>
                                    </div>
                                    <div className="mt-2">
                                        <p className="font-marggraff text-xl">
                                            21:00
                                        </p>
                                        <p>Торт</p>
                                    </div>
                                    <div className="mt-2">
                                        <p className="font-marggraff text-xl">
                                            22:00
                                        </p>
                                        <p>Финал торжества</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 text-primary text-center w-4/5">
                                <h3 className="font-marggraff text-3xl">
                                    Дресскод
                                </h3>
                                <p className="mt-2 font-light text-sm">
                                    Нам будет приятно, если ваши образы
                                    поддержат атмосферу нашего дня.
                                </p>
                                <div className="mt-4 flex flex-row h-14 justify-center w-full gap-8">
                                    <img src={clothManIcon} alt="" />
                                    <img src={clothWomanIcon} alt="" />
                                </div>
                                <div className="mt-4 flex flex-row gap-1">
                                    {colors.map((col, i) => (
                                        <div
                                            className="min-h-4 w-full"
                                            key={i}
                                            style={{ backgroundColor: col }}
                                        ></div>
                                    ))}
                                </div>
                                <p className="mt-2 font-light text-xs opacity-50">
                                    * желательно не яркие цвета
                                </p>
                            </div>

                            <div className="mt-8 text-primary text-center w-full">
                                <h3 className="font-marggraff text-3xl">
                                    Место росписи
                                </h3>
                                <div className="mt-4 relative overflow-hidden h-40 text-page">
                                    <img
                                        className="absolute bottom-0 w-full scale-105"
                                        src={streetIcon}
                                        alt=""
                                        style={{ filter: "blur(3px)" }}
                                    />
                                    <p className="absolute top-2 left-4 right-4 text-center">
                                        Сбор гостей состоится возле Медеуского
                                        отдела РАГС
                                        <br />
                                        по адресу: ул. Кунаева, 108
                                    </p>
                                    <div className="absolute w-full bottom-6 left-0 right-0">
                                        <button
                                            className="w-48 h-10 bg-white/30 rounded-full cursor-pointer"
                                            type="button"
                                            onClick={() => {
                                                window.location.assign(
                                                    "https://2gis.kz/almaty/firm/9429940000784689",
                                                );
                                            }}
                                        >
                                            Посмотреть карту
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 text-primary text-center w-full">
                                <h3 className="font-marggraff text-3xl">
                                    Место празднования
                                </h3>
                                <div className="mt-4 relative overflow-hidden h-40 text-page">
                                    <img
                                        className="absolute bottom-0 w-full scale-105"
                                        src={streetIcon}
                                        alt=""
                                        style={{ filter: "blur(3px)" }}
                                    />
                                    <p className="absolute top-2 left-4 right-4 text-center">
                                        Начало празднования состоится в коттедже
                                        <br />
                                        по адресу: ул. Мухитдинова 85/1
                                    </p>
                                    <div className="absolute w-full bottom-6 left-0 right-0">
                                        <button
                                            className="w-48 h-10 bg-white/30 rounded-full cursor-pointer"
                                            type="button"
                                            onClick={() => {
                                                window.location.assign(
                                                    "https://go.2gis.com/A8JsR",
                                                );
                                            }}
                                        >
                                            Посмотреть карту
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex flex-col justify-center items-center h-20 gap-2 text-primary">
                    <div
                        className="flex flex-row gap-2 cursor-pointer"
                        onClick={() => {
                            window.location.assign("https://wa.me/77476903698");
                        }}
                    >
                        <img
                            className="svg-primary w-5 aspect-square"
                            src={whatsappIcon}
                            alt="whatsapp"
                        />
                        <p>+7 747 690 3698</p>
                        <p className="font-marggraff">Адиль</p>
                    </div>
                    <div
                        className="flex flex-row gap-2 cursor-pointer"
                        onClick={() => {
                            window.location.assign("https://wa.me/77086028076");
                        }}
                    >
                        <img
                            className="w-5 aspect-square"
                            src={whatsappIcon}
                            alt="whatsapp"
                        />
                        <p>+7 708 602 8076</p>
                        <p className="font-marggraff">Дарья</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
