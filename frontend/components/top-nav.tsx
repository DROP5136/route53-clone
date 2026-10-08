import { Bell, CircleHelp, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function TopNav() {
  return (
    <header className="topnav">
      <div className="topnav-left">
        <Link className="brand" href="/">
          <Image src="/aws-logo.svg" alt="Amazon Web Services" width={47} height={28} priority unoptimized />
        </Link>
        <span className="topnav-service">Route 53</span>
      </div>
      <div className="topnav-right">
        <span className="region">Global</span>
        <button className="icon-button" type="button" aria-label="Notifications">
          <Bell size={16} strokeWidth={2} aria-hidden="true" />
        </button>
        <button className="icon-button" type="button" aria-label="Help">
          <CircleHelp size={16} strokeWidth={2} aria-hidden="true" />
        </button>
        <button className="icon-button" type="button" aria-label="Settings">
          <Settings size={16} strokeWidth={2} aria-hidden="true" />
        </button>
        <button className="account-button" type="button">
          <span className="account-name">Account</span>
          <span className="account-detail">AWS account</span>
        </button>
      </div>
    </header>
  );
}
