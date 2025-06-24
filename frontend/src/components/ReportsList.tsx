import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { reportsApi } from "../services/api";
import { Report } from "../types";
import LoadingSpinner from "./LoadingSpinner";

// 재사용 가능한 스타일 상수들 - 컴포넌트 외부로 이동하여 성능 최적화
const STATS_CARD_CLASS =
  "glass-layer-primary p-8 rounded-3xl backdrop-blur-extreme border-2 border-glass-white-border dark:border-glass-black-border shadow-glass hover:shadow-hover-lift transition-all duration-180 ease-fast-out hover:scale-[1.02] transform will-change-transform";
const FILTER_BUTTON_CLASS =
  "glass-button px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-120 ease-fast-out backdrop-blur-extreme border-2 shadow-glass hover:shadow-hover-lift hover:scale-[1.02] transform will-change-transform";

type FilterType = "all" | "morning" | "evening";

const ReportsList: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<FilterType>("all");

  const limit = 10;

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportsApi.getReports(page, limit);
      setReports(response.reports);
      setTotal(response.total);
    } catch {
      setError("리포트를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getReportTypeText = (type: string) => {
    return type === "morning" ? "🌅 모닝브리핑" : "🌆 이브닝브리핑";
  };

  const getReportIcon = (type: string) => {
    return type === "morning" ? "🌅" : "🌆";
  };

  const filteredReports = reports.filter((report) => {
    if (filter === "all") return true;
    return report.reportType === filter;
  });

  const totalPages = Math.ceil(total / limit);

  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12">
      {/* 극명한 글래스 헤더 */}
      <div className="mb-12">
        <div className="glass-card p-10 bg-glass-gradient border-glass-white-border-strong dark:border-glass-black-border-strong backdrop-blur-extreme">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6 bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent drop-shadow-lg">
            투자 리포트 분석
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 font-medium leading-relaxed">
            매일 오전 8시와 오후 6시에 자동 생성되는 AI 투자 리포트를 확인하세요
          </p>

          {/* 극명한 글래스 통계 카드들 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className={STATS_CARD_CLASS}>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                  {total}
                </div>
                <div className="text-lg text-gray-600 dark:text-gray-300 font-medium">
                  전체 리포트
                </div>
              </div>
            </div>
            <div className={STATS_CARD_CLASS}>
              <div className="text-center">
                <div className="text-4xl font-bold text-financial-green dark:text-financial-green-light mb-2">
                  {
                    reports.filter((report) => report.reportType === "morning")
                      .length
                  }
                </div>
                <div className="text-lg text-gray-600 dark:text-gray-300 font-medium">
                  모닝브리핑
                </div>
              </div>
            </div>
            <div className={STATS_CARD_CLASS}>
              <div className="text-center">
                <div className="text-4xl font-bold text-financial-gold dark:text-financial-gold-light mb-2">
                  {
                    reports.filter((report) => report.reportType === "evening")
                      .length
                  }
                </div>
                <div className="text-lg text-gray-600 dark:text-gray-300 font-medium">
                  이브닝브리핑
                </div>
              </div>
            </div>
            <div className={STATS_CARD_CLASS}>
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-600 dark:text-gray-400 mb-2">
                  {/* TODO: Replace with actual trust score calculation when Report type includes trustScore */}
                  85%
                </div>
                <div className="text-lg text-gray-600 dark:text-gray-300 font-medium">
                  평균 신뢰도
                </div>
              </div>
            </div>
          </div>

          {/* 스케줄 정보 */}
          <div className="glass-card p-6 bg-gradient-to-r from-primary-500/10 to-primary-600/10 border-primary-500/30 mt-8">
            <div className="flex items-center space-x-4">
              <span className="text-3xl">⏰</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  자동 생성 스케줄
                </h3>
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  🌅 모닝브리핑: 매일 오전 8시 | 🌆 이브닝브리핑: 매일 오후 6시
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="glass-card p-8 border-l-4 border-financial-red backdrop-blur-extreme mb-8">
          <div className="flex items-center space-x-4">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="font-bold text-financial-red-dark dark:text-financial-red-light text-lg">
                오류 발생
              </h3>
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 극명한 글래스 필터 버튼들 */}
      <div className="flex flex-wrap gap-4 mb-10">
        {[
          { key: "all" as const, label: "전체" },
          { key: "morning" as const, label: "🌅 모닝브리핑" },
          { key: "evening" as const, label: "🌆 이브닝브리핑" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={`${FILTER_BUTTON_CLASS} ${
              filter === item.key
                ? "bg-glass-white-border dark:bg-glass-black-border border-primary-500 text-primary-600 dark:text-primary-400 shadow-glow-primary"
                : "bg-glass-white dark:bg-glass-black border-glass-white-border dark:border-glass-black-border text-gray-700 dark:text-gray-300 hover:border-primary-400"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 극명한 글래스 리포트 리스트 */}
      <div className="grid gap-8">
        {filteredReports.map((report, index) => (
          <div
            key={report.id}
            className="group glass-card p-8 hover:scale-[1.008] transition-all duration-180 ease-fast-out backdrop-blur-extreme border-2 border-glass-white-border dark:border-glass-black-border shadow-glass hover:shadow-extreme hover:shadow-glow-primary will-change-transform transform"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {/* 카드 헤더 */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glass group-hover:shadow-glow-primary transition-all duration-180 ease-fast-out transform group-hover:scale-105 will-change-transform">
                    <span className="text-white text-2xl drop-shadow-lg">
                      {getReportIcon(report.reportType)}
                    </span>
                  </div>
                  {/* 글로우 효과 */}
                  <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 opacity-0 blur-lg group-hover:opacity-20 transition-opacity duration-180"></div>
                </div>
                <div>
                  <div className="flex items-center space-x-4 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {getReportTypeText(report.reportType)}
                    </h2>
                    <span className="px-4 py-2 bg-primary-500/20 text-primary-700 dark:text-primary-300 rounded-full text-sm font-bold backdrop-blur-sm">
                      최신
                    </span>
                  </div>
                  <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
                    {formatDate(report.createdAt)}
                  </p>
                </div>
              </div>

              <Link
                to={`/reports/${report.id}`}
                className="glass-button px-6 py-3 bg-primary-500/20 hover:bg-primary-500/30 text-primary-700 dark:text-primary-300 rounded-2xl font-bold transition-all duration-120 ease-fast-out transform hover:scale-[1.02] backdrop-blur-extreme border-2 border-glass-white-border dark:border-glass-black-border will-change-transform"
              >
                자세히 보기 →
              </Link>
            </div>

            {/* 요약 정보 */}
            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-glass-white dark:bg-glass-black backdrop-blur-extreme border border-glass-white-border dark:border-glass-black-border">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                  📋 주요 내용
                </h3>
                <p className="text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                  {report.summary ||
                    "이 리포트는 최신 시장 동향과 AI 분석을 통한 투자 인사이트를 제공합니다."}
                </p>
              </div>

              {/* 성과 지표 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-financial-green/10 backdrop-blur-extreme border border-financial-green/30">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-financial-green-dark dark:text-financial-green-light">
                      +12.5%
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 font-semibold">
                      예상 수익률
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-primary-500/10 backdrop-blur-extreme border border-primary-500/30">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                      94%
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 font-semibold">
                      신뢰도
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-financial-gold/10 backdrop-blur-extreme border border-financial-gold/30">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-financial-gold-dark dark:text-financial-gold-light">
                      낮음
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 font-semibold">
                      위험도
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <div className="glass-card text-center py-16 backdrop-blur-extreme border-2 border-glass-white-border dark:border-glass-black-border">
          <div className="text-gray-500 dark:text-gray-400 text-xl">
            선택한 필터에 해당하는 리포트가 없습니다.
          </div>
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-3 mt-12">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="glass-button px-6 py-3 bg-glass-white dark:bg-glass-black hover:bg-glass-white-light dark:hover:bg-glass-black-light disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white rounded-2xl font-semibold backdrop-blur-extreme border-2 border-glass-white-border dark:border-glass-black-border"
          >
            이전
          </button>

          <div className="flex space-x-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages, page - 2 + i));
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`glass-button px-4 py-3 rounded-2xl font-semibold backdrop-blur-extreme border-2 ${
                    pageNum === page
                      ? "bg-primary-500/30 text-primary-700 dark:text-primary-300 border-primary-500"
                      : "bg-glass-white dark:bg-glass-black hover:bg-glass-white-light dark:hover:bg-glass-black-light text-gray-900 dark:text-white border-glass-white-border dark:border-glass-black-border"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="glass-button px-6 py-3 bg-glass-white dark:bg-glass-black hover:bg-glass-white-light dark:hover:bg-glass-black-light disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white rounded-2xl font-semibold backdrop-blur-extreme border-2 border-glass-white-border dark:border-glass-black-border"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportsList;
