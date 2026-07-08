import { useState, useEffect, type SubmitEventHandler } from "react";
import { useAppSelector, useAppDispatch } from "../app/hooks";
import { setUser } from "../features/userSlice";
import editIcon from "../assets/edit.svg";
import hidePasswordIcon from "../assets/hidePassword.png";
import showPasswordIcon from "../assets/showPassword.png";

const API_BASE = "https://api.axerium.org";

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});

const formatToDateTimeLocal = (isoString: string | undefined): string => {
    if (!isoString) return "";
    const date = new Date(isoString);

    const pad = (num: number) => String(num).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function Admin() {
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.user);

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    const [isInitializing, setIsInitializing] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [weddingDate, setWeddingDate] = useState<string>("");
    const [photoDate, setPhotoDate] = useState<string>("");

    const [isEditingWedding, setIsEditingWedding] = useState(false);
    const [isEditingPhoto, setIsEditingPhoto] = useState(false);

    const [initialWedding, setInitialWedding] = useState<string>("");
    const [initialPhoto, setInitialPhoto] = useState<string>("");
    const [isUpdatingEvents, setIsUpdatingEvents] = useState(false);

    const isDatesDirty =
        weddingDate !== initialWedding || photoDate !== initialPhoto;

    const fetchEventDates = async () => {
        try {
            const res = await fetch(`${API_BASE}/events`, {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                const wDate = data.wedding
                    ? formatToDateTimeLocal(data.wedding)
                    : "";
                const pDate = data.photo_unlock
                    ? formatToDateTimeLocal(data.photo_unlock)
                    : "";

                setWeddingDate(wDate);
                setInitialWedding(wDate);
                setPhotoDate(pDate);
                setInitialPhoto(pDate);
            }
        } catch (e) {
            console.error("Failed to fetch event dates parameters", e);
        }
    };

    useEffect(() => {
        const validateSession = async () => {
            try {
                const response = await fetch(`${API_BASE}/login/validate`, {
                    method: "GET",
                    credentials: "include",
                });

                if (response.ok) {
                    const data = await response.json();
                    dispatch(
                        setUser({ userId: data.userId, isAdmin: data.isAdmin }),
                    );

                    if (data.isAdmin) {
                        await fetchEventDates();
                    }
                }
            } catch (err) {
                console.error(
                    "Initial authorization validation check failed",
                    err,
                );
            } finally {
                setIsInitializing(false);
            }
        };

        validateSession();
    }, [dispatch]);

    const handleLogin: SubmitEventHandler = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            setErrorMsg("Fill out all fields");
            return;
        }

        setIsSubmitting(true);
        setErrorMsg(null);

        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name: username, password: password }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Invalid username or password");
                }
                throw new Error("Server error, try again later");
            }

            const data = await response.json();
            dispatch(setUser({ userId: data.userId, isAdmin: data.isAdmin }));
        } catch (err) {
            if (err instanceof Error) {
                setErrorMsg(err.message);
            } else {
                setErrorMsg("Something went wrong");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChangePassword: SubmitEventHandler = async (e) => {
        e.preventDefault();
        setPasswordError(null);
        setPasswordSuccess(false);

        if (!oldPassword || !newPassword) {
            setPasswordError("Fill out all fields");
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/user/change-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ oldPassword, newPassword }),
            });

            if (!response.ok) {
                if (response.status === 401)
                    throw new Error("Incorrect current password");
                const txt = await response.text();
                throw new Error(txt || "Failed to update password");
            }

            setPasswordSuccess(true);
            setOldPassword("");
            setNewPassword("");
            setTimeout(() => setIsChangingPassword(false), 2000);
        } catch (err) {
            if (err instanceof Error) {
                setPasswordError(err.message);
            } else {
                setPasswordError("Something went wrong");
            }
        }
    };

    const handleLogout = async () => {
        try {
            await fetch(`${API_BASE}/logout`, {
                method: "POST",
                credentials: "include",
            });
        } catch (err) {
            console.error("Logout request failed", err);
        } finally {
            dispatch(setUser({ userId: 0, isAdmin: false }));
        }
    };

    const handleEventsSubmit = async () => {
        setIsUpdatingEvents(true);
        const payload = [];

        if (weddingDate !== initialWedding && weddingDate) {
            payload.push({
                name: "wedding",
                date: new Date(weddingDate).toISOString(),
            });
        }
        if (photoDate !== initialPhoto && photoDate) {
            payload.push({
                name: "photo_unlock",
                date: new Date(photoDate).toISOString(),
            });
        }

        try {
            const response = await fetch(`${API_BASE}/change-events`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!response.ok)
                throw new Error("Failed to save dates configuration");

            setInitialWedding(weddingDate);
            setInitialPhoto(photoDate);
            setIsEditingWedding(false);
            setIsEditingPhoto(false);
        } catch (err) {
            alert(
                err instanceof Error
                    ? err.message
                    : "Error saving schedule targets",
            );
        } finally {
            setIsUpdatingEvents(false);
        }
    };

    if (isInitializing) {
        return (
            <div className="w-svw flex justify-center">
                <div className="max-w-88 w-10/12 animate-pulse">
                    <div className="py-24 mt-10 flex flex-col items-center bg-page/50 rounded shadow-[0_0_15px_2px] shadow-primary/10">
                        <div className="h-6 w-1/3 bg-primary/20 rounded mb-4"></div>
                        <div className="h-4 w-1/2 bg-primary/10 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-svw flex justify-center">
            <div className="max-w-88 w-10/12">
                <div className="py-4 mt-10 flex flex-col items-center bg-page shadow-[0_0_15px_2px] shadow-primary/20 text-primary relative">
                    <h2 className="mb-4 font-marggraff text-3xl">Admin Page</h2>

                    {user.isAdmin ? (
                        <div className="w-10/12">
                            {!isChangingPassword ? (
                                <>
                                    <div className="flex flex-row justify-between items-center min-h-8">
                                        <p>Wedding date:</p>
                                        <div className="flex flex-row items-center">
                                            {isEditingWedding ? (
                                                <input
                                                    type="datetime-local"
                                                    className="outline-none border-b border-solid border-primary bg-transparent text-sm text-center px-1"
                                                    value={weddingDate}
                                                    onChange={(e) =>
                                                        setWeddingDate(
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            ) : (
                                                <p
                                                    className={
                                                        !weddingDate
                                                            ? "text-red-400 italic text-sm"
                                                            : ""
                                                    }
                                                >
                                                    {weddingDate
                                                        ? dateFormatter.format(
                                                              new Date(
                                                                  weddingDate,
                                                              ),
                                                          )
                                                        : "not specified"}
                                                </p>
                                            )}
                                            <button
                                                className={`w-5 aspect-square ml-2 cursor-pointer transition-opacity ${isEditingWedding ? "opacity-40" : "opacity-100"}`}
                                                type="button"
                                                onClick={() =>
                                                    setIsEditingWedding(
                                                        !isEditingWedding,
                                                    )
                                                }
                                            >
                                                <img
                                                    src={editIcon}
                                                    alt="edit"
                                                />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex flex-row justify-between items-center min-h-8">
                                        <p>Photo unlock date:</p>
                                        <div className="flex flex-row items-center">
                                            {isEditingPhoto ? (
                                                <input
                                                    type="datetime-local"
                                                    className="outline-none border-b border-solid border-primary bg-transparent text-sm text-center px-1"
                                                    value={photoDate}
                                                    onChange={(e) =>
                                                        setPhotoDate(
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            ) : (
                                                <p
                                                    className={
                                                        !photoDate
                                                            ? "text-red-400 italic text-sm"
                                                            : ""
                                                    }
                                                >
                                                    {photoDate
                                                        ? dateFormatter.format(
                                                              new Date(
                                                                  photoDate,
                                                              ),
                                                          )
                                                        : "not specified"}
                                                </p>
                                            )}
                                            <button
                                                className={`w-5 aspect-square ml-2 cursor-pointer transition-opacity ${isEditingPhoto ? "opacity-40" : "opacity-100"}`}
                                                type="button"
                                                onClick={() =>
                                                    setIsEditingPhoto(
                                                        !isEditingPhoto,
                                                    )
                                                }
                                            >
                                                <img
                                                    src={editIcon}
                                                    alt="edit"
                                                />
                                            </button>
                                        </div>
                                    </div>
                                    {isDatesDirty && (
                                        <div className="mt-4 pt-2 border-t border-dashed border-primary/20 flex justify-between items-center">
                                            <span className="text-xs italic opacity-70">
                                                Unsaved configuration revisions
                                            </span>
                                            <button
                                                onClick={handleEventsSubmit}
                                                disabled={isUpdatingEvents}
                                                className="px-3 py-0.5 text-xs border border-solid border-primary bg-primary/10 cursor-pointer font-bold disabled:opacity-50"
                                                type="button"
                                            >
                                                {isUpdatingEvents
                                                    ? "Saving..."
                                                    : "Submit"}
                                            </button>
                                        </div>
                                    )}
                                    <div className="mt-6 flex justify-between">
                                        <button
                                            onClick={() =>
                                                setIsChangingPassword(true)
                                            }
                                            className="px-4 py-1 border border-solid border-primary cursor-pointer font-medium transition-all hover:bg-primary/5 text-sm"
                                            type="button"
                                        >
                                            Change password
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="px-4 py-1 border border-solid border-red-500 text-red-500 cursor-pointer font-medium transition-all hover:bg-red-500/5 text-sm"
                                            type="button"
                                        >
                                            Log out
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <form
                                    onSubmit={handleChangePassword}
                                    className="flex flex-col"
                                >
                                    <div className="flex flex-row justify-between items-center">
                                        <label
                                            htmlFor="old-pass"
                                            className="text-sm"
                                        >
                                            Current Password:
                                        </label>
                                        <input
                                            id="old-pass"
                                            type="password"
                                            className="ml-4 text-center outline-none border-b border-solid border-primary min-w-0 bg-transparent"
                                            value={oldPassword}
                                            onChange={(e) =>
                                                setOldPassword(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="mt-2 flex flex-row justify-between items-center">
                                        <label
                                            htmlFor="new-pass"
                                            className="text-sm"
                                        >
                                            New Password:
                                        </label>
                                        <input
                                            id="new-pass"
                                            type="password"
                                            className="ml-4 text-center outline-none border-b border-solid border-primary min-w-0 bg-transparent"
                                            value={newPassword}
                                            onChange={(e) =>
                                                setNewPassword(e.target.value)
                                            }
                                        />
                                    </div>
                                    {passwordError && (
                                        <span className="text-red-500 text-xs mt-2 text-left font-medium">
                                            {passwordError}
                                        </span>
                                    )}
                                    {passwordSuccess && (
                                        <span className="text-green-500 text-xs mt-2 text-left font-medium">
                                            Password updated!
                                        </span>
                                    )}

                                    <div className="mt-4 flex justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                setIsChangingPassword(false);
                                                setPasswordError(null);
                                            }}
                                            className="px-3 py-1 text-sm border border-transparent cursor-pointer opacity-70 hover:opacity-100"
                                            type="button"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="px-4 py-1 border border-solid border-primary cursor-pointer font-medium transition-all hover:bg-primary/5 text-sm"
                                            type="submit"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    ) : (
                        <form
                            onSubmit={handleLogin}
                            className="w-10/12 flex flex-col"
                        >
                            <div className="pr-7 flex flex-row justify-between items-center">
                                <label htmlFor="username">Username:</label>
                                <input
                                    id="username"
                                    className="ml-4 text-center outline-none border-b border-solid border-primary min-w-0 bg-transparent"
                                    type="text"
                                    value={username}
                                    onChange={(e) =>
                                        setUsername(e.target.value)
                                    }
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="mt-2 flex flex-row justify-between items-center">
                                <label htmlFor="password">Password:</label>
                                <div className="flex flex-row min-w-0 items-center">
                                    <input
                                        id="password"
                                        className="ml-4 text-center outline-none border-b border-solid border-primary min-w-0 bg-transparent"
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        disabled={isSubmitting}
                                    />
                                    <button
                                        className="w-5 aspect-square ml-2 cursor-pointer focus:outline-none"
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((prev) => !prev)
                                        }
                                    >
                                        <img
                                            src={
                                                showPassword
                                                    ? hidePasswordIcon
                                                    : showPasswordIcon
                                            }
                                            alt="toggle hide"
                                        />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-row justify-between items-center min-h-9.5">
                                <div className="text-red-500 text-sm text-left font-medium pr-2 max-w-[65%] wrap-break-word">
                                    {errorMsg && <span>{errorMsg}</span>}
                                </div>

                                <button
                                    className="px-4 py-1 border border-solid border-primary cursor-pointer disabled:opacity-50 disabled:cursor-wait flex items-center gap-2 font-medium transition-all hover:bg-primary/5"
                                    type="submit"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                                            Wait...
                                        </>
                                    ) : (
                                        "Log in"
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
